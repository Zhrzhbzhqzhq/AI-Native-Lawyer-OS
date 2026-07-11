import type { FastifyInstance } from 'fastify'
import { createPrismaClient } from '@lawdesk/database'
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

    const mock = runtime.run({
      job_id,
      matter_id,
      source,
      files,
    })

    return reply.code(200).send(mock)
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
      materials?: Array<{ material_id: string; title?: string; material_type?: string; source?: string }>
    }

    const matter_id = payload.matter_id ? String(payload.matter_id) : ''
    if (!matter_id) return reply.code(400).send({ error: 'matter_id required' })

    const materials = Array.isArray(payload.materials) ? payload.materials : []
    if (materials.length === 0) return reply.code(400).send({ error: 'materials required' })

    const drafts = runtime.generateEvidenceDrafts({ matter_id, materials })
    return reply.code(200).send(drafts)
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
        evidence_drafts?: Array<{ draft_id?: string; material_id: string; title?: string; evidence_type?: string; proof_purpose?: string; source?: string }>
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
        const createdEv = await evidenceService.createForMatter(matter_id, {
          evidence_id,
          material_id: d.material_id,
          title: d.title || 'untitled',
          evidence_type: d.evidence_type || '',
          description: d.proof_purpose || '',
          relevance: d.proof_purpose || '',
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
      const AIPipelineService = (await import('../services/ai/AIPipelineService')).default
      const pipeline = new AIPipelineService()
      const aiRes = await pipeline.run(caseSummary)

      // persist generated items minimally
      const EvidenceService = (await import('../services/evidenceService')).default
      const FactService = (await import('../services/factService')).default
      const IssueService = (await import('../services/issueService')).default
      const LawService = (await import('../services/lawService')).default
      const ArgumentService = (await import('../services/argumentService')).default
      const DocumentService = (await import('../services/documentService')).default

      const evidenceService = new EvidenceService(prisma)
      const factService = new FactService(prisma)
      const issueService = new IssueService(prisma)
      const lawService = new LawService(prisma)
      const argumentService = new ArgumentService(prisma)
      const documentService = new DocumentService(prisma)

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

      try {
        // Evidence: map strings or objects to Evidence rows
        const evs = Array.isArray(aiRes.steps.evidence) ? aiRes.steps.evidence : []
        for (const e of evs.slice(0, 20)) {
          let title = ''
          let evidence_type = 'AI推荐证据'
          let description = ''
          let relevance = 'AI intake pipeline'
          let material_id = ''
          if (typeof e === 'string') {
            title = e
            description = e
            // string items have no material_id -> skip per new policy
          } else if (e && typeof e === 'object') {
            title = String(e.title || e.name || JSON.stringify(e))
            description = String(e.description || e.proof_purpose || e.title || JSON.stringify(e))
            if (typeof e.evidence_type === 'string') evidence_type = e.evidence_type
            if (typeof e.relevance === 'string') relevance = e.relevance
            if (typeof e.material_id === 'string' && String(e.material_id).trim().length > 0) material_id = String(e.material_id)
          }

          if (!material_id) {
            // if we created a summary material above, attach evidence to it
            if (summary_material_id) {
              material_id = summary_material_id
            } else {
              try {
                aiErrors.push(`evidence skipped: missing material_id (${String(title).slice(0, 120)})`)
              } catch (_) {
                aiErrors.push('evidence skipped: missing material_id')
              }
              continue
            }
          }

          const evidence_id = `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
          await evidenceService.createForMatter(matter_id, { evidence_id, material_id, title: String(title), evidence_type, description, relevance, status: 'active' })
          createdCounts.evidence_count++
        }

        // Facts
        const fs = Array.isArray(aiRes.steps.facts) ? aiRes.steps.facts : []
        for (const f of fs.slice(0, 50)) {
          const title = typeof f === 'string' ? f : (f.title || (f.description ? String(f.description).slice(0, 120) : JSON.stringify(f)))
          await factService.createFact(matter_id, { title: String(title), description: typeof f === 'string' ? '' : (f.description || '') })
          createdCounts.facts_count++
        }

        // Issues
        const iss = Array.isArray(aiRes.steps.issues) ? aiRes.steps.issues : []
        for (const it of iss.slice(0, 20)) {
          const title = typeof it === 'string' ? it : (it.title || JSON.stringify(it))
          await issueService.createIssue(matter_id, { title: String(title), description: '' })
          createdCounts.issues_count++
        }

        // Laws
        const laws = Array.isArray(aiRes.steps.laws) ? aiRes.steps.laws : []
        for (const l of laws.slice(0, 50)) {
          let title = ''
          let citation = ''
          if (typeof l === 'string') {
            title = l
            citation = l
          } else if (l && typeof l === 'object') {
            title = String(l.code || l.title || JSON.stringify(l))
            citation = String(l.code || '')
          }
          await lawService.createLaw(matter_id, { title: String(title), citation })
          createdCounts.laws_count++
        }

        // Arguments
        const args = Array.isArray(aiRes.steps.arguments) ? aiRes.steps.arguments : []
        for (const a of args.slice(0, 50)) {
          let title = ''
          let description = ''
          if (typeof a === 'string') {
            title = String(a).slice(0, 80)
            description = String(a)
          } else if (a && typeof a === 'object') {
            const side = String(a.side || '')
            const point = String(a.point || a.description || '')
            title = side ? `${side}：法律论点` : (a.title || JSON.stringify(a))
            description = point
          }
          await argumentService.createArgument(matter_id, { title: String(title), description: String(description) })
          createdCounts.arguments_count++
        }

        // Documents
        const docs = Array.isArray(aiRes.steps.documents) ? aiRes.steps.documents : []
        for (const d of docs.slice(0, 20)) {
          let title = 'AI doc'
          let document_type = 'draft'

          // Extract content from common fields returned by AI: prefer `content`, then `body`, then `text`.
          // If none are present or all are empty, skip creating a document to avoid persisting empty drafts.
          // Reason: prevent empty draft documents from polluting the database when AI returns metadata only.
          let contentCandidate: any = null
          if (typeof d === 'string') {
            title = String(d).slice(0, 120)
            contentCandidate = d
          } else if (d && typeof d === 'object') {
            title = String(d.type || d.title || 'AI doc')
            document_type = String(d.type || 'draft')
            // prefer explicit content fields if present
            if (typeof d.content === 'string') contentCandidate = d.content
            else if (typeof d.body === 'string') contentCandidate = d.body
            else if (typeof d.text === 'string') contentCandidate = d.text
            else if (d && typeof d === 'object') {
              // fallback: stringify if object contains meaningful content fields
              try { contentCandidate = JSON.stringify(d.content || d) } catch (_) { contentCandidate = '' }
            }
          }

          const contentStr = (typeof contentCandidate === 'string' ? contentCandidate.trim() : '')
          if (!contentStr) {
            // Skip creating a document when AI provided no textual content.
            // This avoids creating empty draft records like those observed in the audit (M136.1-M136.6).
            continue
          }

          await documentService.createForMatter(matter_id, { document_id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, title: String(title), document_type: String(document_type), content_uri: '', content: contentStr, version: 'v1', status: 'draft' })
          createdCounts.documents_count++
        }
      } catch (e) {
        // record insert/persistence error (do not fully swallow)
        console.error('ai create writes error', e)
        try { aiErrors.push(`persist_error: ${String((e as any).message || e)}`) } catch (_) { aiErrors.push('persist_error') }
      }

      const meta: any = { ai: createdCounts }
      if (aiRes && aiRes.fallback_used) meta.ai.fallback_used = true
      if (aiRes && aiRes.validation) meta.ai.validation = aiRes.validation
      if (aiRes && aiRes.error) meta.ai.error = aiRes.error
      if (aiErrors.length > 0) meta.ai.errors = aiErrors

      // if nothing persisted, surface a clear top-level error
      try {
        const total = (createdCounts.evidence_count || 0) + (createdCounts.facts_count || 0) + (createdCounts.issues_count || 0) + (createdCounts.documents_count || 0)
        if (total === 0) {
          meta.ai.error = meta.ai.error || 'AI pipeline produced no persistable records'
          meta.ai.errors = Array.isArray(meta.ai.errors) ? meta.ai.errors : []
          if (!meta.ai.errors.includes('AI pipeline produced no persistable records')) meta.ai.errors.push('AI pipeline produced no persistable records')
        }
      } catch (_) { }

      // attempt to run DocumentPipeline to produce a draft document synchronously
      try {
        const DocumentPipelineClass = (await import('../services/ai/DocumentPipeline')).default
        const docPipeline = new DocumentPipelineClass(prisma)
        const docRes = await docPipeline.run(matter_id)
        meta.document_pipeline = docRes
        // increment document count if pipeline created a draft
        try {
          if (docRes && docRes.draftDocumentId) meta.ai.created_documents_from_pipeline = 1
        } catch (e) { }
        // if pipeline didn't return a draft id, attempt a lightweight fallback draft
        if (!(docRes && docRes.draftDocumentId)) {
          try {
            const fallbackDoc = await documentService.createForMatter(matter_id, { title: `案件草稿 - ${title || '未命名'}`, document_type: 'draft', content: String(caseSummary || '').slice(0, 2000), status: 'draft' })
            meta.document_pipeline = { success: true, draftDocumentId: fallbackDoc.document_id, fallback: true }
            meta.ai.created_documents_from_pipeline = (meta.ai.created_documents_from_pipeline || 0) + 1
          } catch (e: any) {
            // ignore fallback failure but record
            meta.ai.document_pipeline_error = meta.ai.document_pipeline_error || String(e?.message || e || 'document_pipeline_fallback_failed')
          }
        }
      } catch (e: any) {
        // do not fail the whole intake on pipeline errors; surface in meta and attempt fallback
        meta.ai.document_pipeline_error = String(e?.message || e || 'document_pipeline_failed')
        try {
          const fallbackDoc = await documentService.createForMatter(matter_id, { title: `案件草稿 - ${title || '未命名'}`, document_type: 'draft', content: String(caseSummary || '').slice(0, 2000), status: 'draft' })
          meta.document_pipeline = { success: true, draftDocumentId: fallbackDoc.document_id, fallback: true }
          meta.ai.created_documents_from_pipeline = (meta.ai.created_documents_from_pipeline || 0) + 1
        } catch (e: any) {
          // fallback also failed; record but continue
          meta.ai.document_pipeline_error = meta.ai.document_pipeline_error + ' | fallback_failed:' + String(e?.message || e || '')
        }
      }

      return reply.code(201).send({ matter_id, created: true, ...meta })
    } finally {
      try { await prisma.$disconnect() } catch (e) { }
    }
  })
}

export default intakeRoutes
