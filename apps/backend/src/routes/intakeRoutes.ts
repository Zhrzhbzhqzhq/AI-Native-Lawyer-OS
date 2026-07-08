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

      try {
        // Evidence: expect array of strings
        const evs = Array.isArray(aiRes.steps.evidence) ? aiRes.steps.evidence : []
        for (const e of evs.slice(0, 20)) {
          const title = typeof e === 'string' ? e : (e.title || JSON.stringify(e))
          const evidence_id = `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
          await evidenceService.createForMatter(matter_id, { evidence_id, material_id: '', title: String(title), evidence_type: '', description: '', relevance: '' })
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
          const title = typeof l === 'string' ? l : (l.title || (l.code || JSON.stringify(l)))
          await lawService.createLaw(matter_id, { title: String(title), citation: typeof l === 'object' && l.code ? String(l.code) : '' })
          createdCounts.laws_count++
        }

        // Arguments
        const args = Array.isArray(aiRes.steps.arguments) ? aiRes.steps.arguments : []
        for (const a of args.slice(0, 50)) {
          const title = typeof a === 'string' ? a : (a.title || JSON.stringify(a))
          await argumentService.createArgument(matter_id, { title: String(title), description: typeof a === 'object' && a.point ? String(a.point) : '' })
          createdCounts.arguments_count++
        }

        // Documents
        const docs = Array.isArray(aiRes.steps.documents) ? aiRes.steps.documents : []
        for (const d of docs.slice(0, 20)) {
          const title = typeof d === 'string' ? d : (d.type ? `${d.type}` : (d.title || 'AI doc'))
          const content = typeof d === 'string' ? d : (d.content || JSON.stringify(d))
          await documentService.createForMatter(matter_id, { document_id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, title: String(title), document_type: 'draft', content_uri: '', version: 'v1', status: 'draft' })
          createdCounts.documents_count++
        }
      } catch (e) {
        // swallow individual create errors to avoid blocking overall creation
        console.error('ai create writes error', e)
      }

      const meta: any = { ai: createdCounts }
      if (aiRes && aiRes.fallback_used) meta.ai.fallback_used = true
      if (aiRes && aiRes.validation) meta.ai.validation = aiRes.validation
      if (aiRes && aiRes.error) meta.ai.error = aiRes.error
      return reply.code(201).send({ matter_id, created: true, ...meta })
    } finally {
      try { await prisma.$disconnect() } catch (e) { }
    }
  })
}

export default intakeRoutes
