import type { FastifyInstance } from 'fastify'
import { createPrismaClient } from '@lawdesk/database'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import IntakeRuntime, { type IntakeFileMeta, type IntakeSource } from '../runtime/intakeRuntime'
import MaterialService from '../services/materialService'
import EvidenceService from '../services/evidenceService'
import DocumentService from '../services/documentService'

// Simple in-memory idempotency store for alpha: endpoint|matter_id|idempotency_key -> result
const idempotencyStore = new Map<string, any>()

function makeIdemKey(endpoint: string, matter_id: string, idem?: string) {
  if (!idem) return ''
  return `${endpoint}|${matter_id}|${String(idem)}`
}

function genId(prefix = 'ij-') {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function isTextFile(nameOrPath: string, mimeType?: string) {
  const lower = String(nameOrPath || '').toLowerCase()
  const mime = String(mimeType || '').toLowerCase()
  return lower.endsWith('.md') || lower.endsWith('.txt') || lower.endsWith('.json') || mime.includes('markdown') || mime.includes('text/plain') || mime.includes('application/json')
}

async function enrichIntakeFiles(files: IntakeFileMeta[]) {
  const repoRoot = path.resolve(process.cwd(), '../..')

  return Promise.all(files.map(async (file) => {
    const enriched: IntakeFileMeta = { ...file }
    if (typeof enriched.content === 'string' && enriched.content.trim()) return enriched

    const storageUri = String(enriched.storage_uri || '').trim()
    if (!storageUri || !isTextFile(storageUri, enriched.type)) return enriched

    try {
      const candidate = path.isAbsolute(storageUri) ? storageUri : path.resolve(repoRoot, storageUri)
      const relative = path.relative(repoRoot, candidate)
      if (relative.startsWith('..') || path.isAbsolute(relative)) return enriched

      enriched.content = await readFile(candidate, 'utf8')
    } catch (e) {
      // Non-text or unavailable files fall back to metadata-only analysis.
    }

    return enriched
  }))
}

export async function intakeRoutes(app: FastifyInstance) {
  const runtime = new IntakeRuntime()
  const allowedIncomingSources = ['Plaintiff', 'Opponent', 'Court', 'Third Party', 'client', 'opponent', 'court', 'third_party']

  app.post('/intake', async (request, reply) => {
    const payload = (request.body || {}) as {
      files?: IntakeFileMeta[]
      matter_id?: string
      source?: string
    }

    const files = Array.isArray(payload.files) ? payload.files : []
    const matter_id = payload.matter_id ? String(payload.matter_id) : null
    const incomingSource = String(payload.source || '')

    if (!allowedIncomingSources.includes(incomingSource)) {
      return reply.code(400).send({ error: 'invalid source' })
    }

    const source = (() => {
      const s = incomingSource
      if (s === 'client') return 'Plaintiff'
      if (s === 'opponent') return 'Opponent'
      if (s === 'court') return 'Court'
      if (s === 'third_party') return 'Third Party'
      return s as IntakeSource
    })()

    if (files.length === 0) {
      return reply.code(400).send({ error: 'files required' })
    }

    // source normalized to IntakeSource in `source` variable

    const job_id = genId()

    const enrichedFiles = await enrichIntakeFiles(files)

    const mock = runtime.run({
      job_id,
      matter_id,
      source,
      files: enrichedFiles,
    })

    return reply.code(200).send({
      ...mock,
      matter_draft: mock.analysis.matter_draft,
    })
  })

  app.post('/intake/confirm-material', async (request, reply) => {
    const prisma = createPrismaClient()
    const materialService = new MaterialService(prisma)

    try {
      const payload = (request.body || {}) as {
        matter_id?: string
        source?: 'client' | 'opponent' | 'court' | 'third_party'
        files?: Array<{ name: string; mime_type?: string }>
        analysis?: { summary?: string; material_suggestions?: unknown[] }
        idempotency_key?: string
      }

      const matter_id = payload.matter_id ? String(payload.matter_id) : ''
      if (!matter_id) return reply.code(400).send({ error: 'matter_id required' })

      const allowedSource = ['client', 'opponent', 'court', 'third_party']
      const source = String(payload.source || '')
      if (!allowedSource.includes(source)) return reply.code(400).send({ error: 'invalid source' })

      const files = Array.isArray(payload.files) ? payload.files : []

      const idem = String(payload.idempotency_key || '')
      const mapKey = makeIdemKey('confirm-material', matter_id, idem)
      if (mapKey && idempotencyStore.has(mapKey)) {
        return reply.code(200).send(idempotencyStore.get(mapKey))
      }

      const created: any[] = []
      for (const f of files) {
        const material_id = `mat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
        const title = f.name || 'unnamed'
        const createdMaterial = await materialService.createForMatter(matter_id, {
          material_id,
          title,
          material_type: 'uploaded',
          source,
          storage_uri: '',
          status: 'active',
        })
        created.push(createdMaterial)
      }

      const result = { status: 'material_created', matter_id, created_materials: created }
      if (mapKey) idempotencyStore.set(mapKey, result)
      return reply.code(200).send(result)
    } finally {
      try {
        await prisma.$disconnect()
      } catch (e) {
        // ignore
      }
    }
  })

  app.post('/intake/evidence-draft', async (request, reply) => {
    const payload = (request.body || {}) as {
      matter_id?: string
      materials?: Array<{ material_id: string; title?: string; material_type?: string; source?: string; content?: string; storage_uri?: string }>
    }

    const matter_id = payload.matter_id ? String(payload.matter_id) : ''
    if (!matter_id) return reply.code(400).send({ error: 'matter_id required' })

    const materials = Array.isArray(payload.materials) ? payload.materials : []
    if (materials.length === 0) return reply.code(400).send({ error: 'materials required' })

    const prisma = createPrismaClient()
    try {
      const ids = materials.map((m) => String(m.material_id || '')).filter(Boolean)
      const storedMaterials = ids.length > 0
        ? await prisma.material.findMany({ where: { matter_id, material_id: { in: ids } } }).catch(() => [])
        : []
      const storedById = new Map(storedMaterials.map((m: any) => [String(m.material_id), m]))
      const materialFiles = materials.map((m) => {
        const stored = storedById.get(String(m.material_id || '')) as any
        return {
          material_id: String(m.material_id || ''),
          title: String(m.title || stored?.title || ''),
          material_type: String(m.material_type || stored?.material_type || 'document'),
          source: String(m.source || stored?.source || 'client'),
          storage_uri: String(m.storage_uri || stored?.storage_uri || ''),
          content: typeof m.content === 'string' ? m.content : undefined,
        }
      })
      const enriched = await enrichIntakeFiles(materialFiles.map((m) => ({
        name: m.title,
        type: m.material_type,
        content: m.content,
        storage_uri: m.storage_uri,
      })))
      const enrichedMaterials = materialFiles.map((m, idx) => ({
        ...m,
        content: enriched[idx]?.content || m.content || '',
      }))

      const drafts = runtime.generateEvidenceDrafts({ matter_id, materials: enrichedMaterials })
      return reply.code(200).send(drafts)
    } finally {
      try {
        await prisma.$disconnect()
      } catch (e) {
        // ignore
      }
    }
  })

  app.post('/intake/challenge-draft', async (request, reply) => {
    const payload = (request.body || {}) as {
      matter_id?: string
      evidence_drafts?: Array<{ draft_id?: string; material_id?: string; title?: string; evidence_type?: string; proof_purpose?: string; source?: string; suggested_action?: string }>
    }

    const matter_id = payload.matter_id ? String(payload.matter_id) : ''
    if (!matter_id) return reply.code(400).send({ error: 'matter_id required' })

    const drafts = Array.isArray(payload.evidence_drafts) ? payload.evidence_drafts : []
    if (drafts.length === 0) return reply.code(400).send({ error: 'evidence_drafts required' })

    // only accept opponent source drafts
    for (const d of drafts) {
      const s = String(d.source || '')
      if (s !== 'opponent') return reply.code(400).send({ error: 'only opponent drafts accepted' })
    }

    const result = runtime.generateChallengeDrafts({ matter_id, evidence_drafts: drafts as any })
    return reply.code(200).send(result)
  })

  app.post('/intake/confirm-challenge-document', async (request, reply) => {
    const prisma = createPrismaClient()
    const documentService = new DocumentService(prisma)

    try {
      const payload = (request.body || {}) as {
        matter_id?: string
        challenge_opinion_drafts?: Array<{
          draft_id?: string
          evidence_draft_id?: string
          title?: string
          challenge_points?: unknown
          suggested_opinion?: string
          requires_lawyer_confirmation?: boolean
        }>
        idempotency_key?: string
      }

      const matter_id = payload.matter_id ? String(payload.matter_id) : ''
      if (!matter_id) return reply.code(400).send({ error: 'matter_id required' })

      const drafts = Array.isArray(payload.challenge_opinion_drafts) ? payload.challenge_opinion_drafts : []
      if (drafts.length === 0) return reply.code(400).send({ error: 'challenge_opinion_drafts required' })

      const idem = String(payload.idempotency_key || '')
      const mapKey = makeIdemKey('confirm-challenge-document', matter_id, idem)
      if (mapKey && idempotencyStore.has(mapKey)) {
        return reply.code(200).send(idempotencyStore.get(mapKey))
      }

      // only accept drafts that have requires_lawyer_confirmation === true
      for (const d of drafts) {
        if (d.requires_lawyer_confirmation !== true) return reply.code(400).send({ error: 'drafts must be confirmed by lawyer' })
      }

      const created: any[] = []
      for (const d of drafts) {
        const document_id = `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
        const doc = await documentService.createForMatter(matter_id, {
          document_id,
          title: d.title || 'untitled',
          document_type: 'challenge_opinion',
          content_uri: '',
          version: 'v1',
          status: 'draft',
        })
        created.push({ document_id: doc.document_id, matter_id: doc.matter_id, title: doc.title, document_type: doc.document_type, version: doc.version, status: doc.status })
      }

      const result = { status: 'challenge_document_created', matter_id, created_documents: created }
      if (mapKey) idempotencyStore.set(mapKey, result)
      return reply.code(200).send(result)
    } finally {
      try {
        await prisma.$disconnect()
      } catch (e) {
        // ignore
      }
    }
  })

  app.post('/intake/document-update-suggestions', async (request, reply) => {
    const payload = (request.body || {}) as {
      matter_id?: string
      trigger?: { type?: string; id?: string; title?: string }
    }

    const matter_id = payload.matter_id ? String(payload.matter_id) : ''
    if (!matter_id) return reply.code(400).send({ error: 'matter_id required' })

    const trig = payload.trigger || {}
    const t = String(trig.type || '')
    if (!(t === 'evidence_created' || t === 'challenge_document_created')) return reply.code(400).send({ error: 'invalid trigger.type' })

    const result = runtime.generateDocumentUpdateSuggestions({ matter_id, trigger: { type: t as any, id: String(trig.id || ''), title: String(trig.title || '') } })
    return reply.code(200).send(result)
  })

  app.post('/intake/confirm-document-update', async (request, reply) => {
    const prisma = createPrismaClient()
    const documentService = new DocumentService(prisma)

    try {
      const payload = (request.body || {}) as {
        matter_id?: string
        document_update_suggestions?: Array<{
          suggestion_id?: string
          target_document_type?: string
          target_title?: string
          reason?: string
          suggested_change_summary?: string
          requires_lawyer_confirmation?: boolean
        }>
        idempotency_key?: string
      }

      const matter_id = payload.matter_id ? String(payload.matter_id) : ''
      if (!matter_id) return reply.code(400).send({ error: 'matter_id required' })

      const suggestions = Array.isArray(payload.document_update_suggestions) ? payload.document_update_suggestions : []
      if (suggestions.length === 0) return reply.code(400).send({ error: 'document_update_suggestions required' })

      for (const s of suggestions) {
        if (s.requires_lawyer_confirmation !== true) return reply.code(400).send({ error: 'all suggestions must be confirmed by lawyer' })
      }

      const idem = String(payload.idempotency_key || '')
      const mapKey = makeIdemKey('confirm-document-update', matter_id, idem)
      if (mapKey && idempotencyStore.has(mapKey)) {
        return reply.code(200).send(idempotencyStore.get(mapKey))
      }

      const created: any[] = []
      for (const s of suggestions) {
        const document_id = `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
        const doc = await documentService.createForMatter(matter_id, {
          document_id,
          title: String(s.target_title || ''),
          document_type: String(s.target_document_type || ''),
          content_uri: '',
          version: 'v2',
          status: 'draft',
        })
        created.push({ document_id: doc.document_id, title: doc.title, document_type: doc.document_type, version: doc.version, status: doc.status })
      }

      const result = { status: 'document_version_created', matter_id, created_versions: created }
      if (mapKey) idempotencyStore.set(mapKey, result)
      return reply.code(200).send(result)
    } finally {
      try {
        await prisma.$disconnect()
      } catch (e) {
        // ignore
      }
    }
  })

  app.post('/intake/confirm-evidence', async (request, reply) => {
    const prisma = createPrismaClient()
    const evidenceService = new EvidenceService(prisma)

    try {
      const payload = (request.body || {}) as {
        matter_id?: string
        evidence_drafts?: Array<{
          draft_id?: string
          material_id?: string
          source_material_ids?: string[]
          materials?: Array<{ material_id?: string; title?: string }>
          title?: string
          evidence_type?: string
          proof_purpose?: string
          description?: string
          relevance?: string
          summary?: string
          reasoning?: string
          confidence?: number
          source?: string
        }>
        idempotency_key?: string
      }

      const matter_id = payload.matter_id ? String(payload.matter_id) : ''
      if (!matter_id) return reply.code(400).send({ error: 'matter_id required' })

      const drafts = Array.isArray(payload.evidence_drafts) ? payload.evidence_drafts : []
      if (drafts.length === 0) return reply.code(400).send({ error: 'evidence_drafts required' })

      const idem = String(payload.idempotency_key || '')
      const mapKey = makeIdemKey('confirm-evidence', matter_id, idem)
      if (mapKey && idempotencyStore.has(mapKey)) {
        return reply.code(200).send(idempotencyStore.get(mapKey))
      }

      const created: any[] = []
      for (const d of drafts) {
        const evidence_id = `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
        const sourceMaterialIds = Array.isArray(d.source_material_ids) && d.source_material_ids.length > 0
          ? d.source_material_ids.map((id) => String(id)).filter(Boolean)
          : [String(d.material_id || '')].filter(Boolean)
        const material_id = String(d.material_id || sourceMaterialIds[0] || '')
        if (!material_id) return reply.code(400).send({ error: 'material_id required' })

        const sourceTitles = Array.isArray(d.materials)
          ? d.materials.map((m) => String(m.title || m.material_id || '')).filter(Boolean)
          : []
        const summary = String(d.summary || d.description || '').trim()
        const proofPurpose = String(d.proof_purpose || d.relevance || '').trim()
        const reasoning = String(d.reasoning || '').trim()
        const confidence = typeof d.confidence === 'number' && Number.isFinite(d.confidence)
          ? Math.max(0, Math.min(1, d.confidence))
          : undefined
        const detailParts = [
          summary ? `摘要：${summary}` : '',
          proofPurpose ? `证明目标：${proofPurpose}` : '',
          reasoning ? `AI判断理由：${reasoning}` : '',
          typeof confidence === 'number' ? `可信度：${confidence}` : '',
          sourceMaterialIds.length > 1 ? `来源材料ID：${sourceMaterialIds.join(', ')}` : '',
          sourceTitles.length > 0 ? `来源材料：${sourceTitles.join('、')}` : '',
        ].filter((part) => String(part).trim().length > 0)
        const createdEv = await evidenceService.createForMatter(matter_id, {
          evidence_id,
          material_id,
          title: d.title || 'untitled',
          evidence_type: d.evidence_type || '',
          description: detailParts.join('\n'),
          relevance: proofPurpose,
          status: 'active',
        })
        created.push(createdEv)
      }

      const result = { status: 'evidence_created', matter_id, created_evidence: created }
      if (mapKey) idempotencyStore.set(mapKey, result)
      return reply.code(200).send(result)
    } finally {
      try {
        await prisma.$disconnect()
      } catch (e) {
        // ignore
      }
    }
  })

  app.post('/intake/ai-create-matter', async (request, reply) => {
    const prisma = createPrismaClient()
    try {
      const payload = (request.body || {}) as {
        title?: string
        client_name?: string
        opponent_name?: string
        matter_type?: string
        case_summary?: string
      }

      const title = String(payload.title || '').trim()
      if (!title) return reply.code(400).send({ error: 'title required' })

      // compose case summary from fields if not provided
      const caseSummary = String(payload.case_summary || `案件名称：${title}\n委托人：${payload.client_name || ''}\n对方当事人：${payload.opponent_name || ''}\n案件类型：${payload.matter_type || ''}`)

      // create matter
      const MatterService = (await import('../services/matterService')).default
      const matterService = new MatterService(prisma)
      const matter_id = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      const created = await matterService.create({ matter_id, title, description: caseSummary, matter_type: String(payload.matter_type || '') })

      // create a Material for the case summary so AI evidence can be attached
      const materialService = new MaterialService(prisma)
      let summary_material_id = ''
      let createdSummaryMaterial: any = null
      try {
        const trimmed = String(caseSummary || '').trim()
        if (trimmed.length > 0) {
          summary_material_id = `mat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
          // reuse existing service to create a real Material; title and type per requirement
          createdSummaryMaterial = await materialService.createForMatter(matter_id, {
            material_id: summary_material_id,
            title: '案件事实摘要',
            material_type: 'text',
            source: 'ai',
            storage_uri: '',
            status: 'active',
          })
        }
      } catch (err) {
        // if material creation fails, record but continue (evidence will be skipped)
        try { console.error('create summary material error', err) } catch (_) { }
      }

      // run AI pipeline
      let aiRes: any = null
      let aiConfigurationRequired = false
      try {
        const AIPipelineService = (await import('../services/ai/AIPipelineService')).default
        const pipeline = new AIPipelineService()
        aiRes = await pipeline.run(caseSummary)
      } catch (error: any) {
        const code = String(error?.message || error || '')
        if (code === 'ai_provider_not_configured' || code.startsWith('ai_provider_key_missing:')) {
          aiConfigurationRequired = true
        } else {
          throw error
        }
      }

      const createdCounts: any = { evidence_count: 0, facts_count: 0, issues_count: 0, laws_count: 0, arguments_count: 0, documents_count: 0 }
      const aiErrors: string[] = []

      // collect validation errors from AI pipeline
      try {
        const v = aiRes && aiRes.validation
        if (v) {
          const steps = ['evidence', 'facts', 'issues', 'laws', 'arguments', 'documents']
          for (const s of steps) {
            try {
              const m = (v as any)[s]
              if (m && m.ok === false) {
                const err = String(m.error || 'parse_error')
                let rawSnippet = ''
                try { if (m.raw) rawSnippet = ` raw:${JSON.stringify(m.raw).slice(0, 200)}` } catch (_) { }
                aiErrors.push(`${s}: ${err}${rawSnippet}`)
              }
            } catch (_) { }
          }
        }
      } catch (_) { }

      // AI output remains draft input only. Formal Evidence, Fact, Issue, Law,
      // Argument and Document objects are created exclusively by their explicit
      // lawyer-confirmation workflows.
      const evidenceDrafts = Array.isArray(aiRes?.steps?.evidence) ? aiRes.steps.evidence.slice(0, 20) : []

      const meta: any = { ai: createdCounts }
      if (aiRes && aiRes.fallback_used) meta.ai.fallback_used = true
      if (aiRes && aiRes.validation) meta.ai.validation = aiRes.validation
      if (aiRes && aiRes.error) meta.ai.error = aiRes.error
      if (aiErrors.length > 0) meta.ai.errors = aiErrors
      meta.ai.evidence_drafts = evidenceDrafts
      if (aiConfigurationRequired) {
        meta.ai.status = 'configuration_required'
        meta.ai.error = 'ai_provider_not_configured'
      }

      // Documents are produced later through the persisted Document Draft workflow.
      // Matter creation must not create formal documents or document drafts.
      meta.document_pipeline = { skipped: true, reason: 'document_draft_workflow_required' }

      return reply.code(201).send({ matter_id, created: true, ...meta })
    } finally {
      try { await prisma.$disconnect() } catch (e) { }
    }
  })
}

export default intakeRoutes
