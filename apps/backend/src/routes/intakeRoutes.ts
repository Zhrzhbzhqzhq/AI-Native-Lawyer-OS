import type { FastifyInstance } from 'fastify'
import { createPrismaClient } from '@lawdesk/database'
import IntakeRuntime, { type IntakeFileMeta, type IntakeSource } from '../runtime/intakeRuntime'
import MaterialService from '../services/materialService'
import EvidenceService from '../services/evidenceService'
import DocumentService from '../services/documentService'

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
      }

      const matter_id = payload.matter_id ? String(payload.matter_id) : ''
      if (!matter_id) return reply.code(400).send({ error: 'matter_id required' })

      const allowedSource = ['client', 'opponent', 'court', 'third_party']
      const source = String(payload.source || '')
      if (!allowedSource.includes(source)) return reply.code(400).send({ error: 'invalid source' })

      const files = Array.isArray(payload.files) ? payload.files : []

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

      return reply.code(200).send({ status: 'material_created', matter_id, created_materials: created })
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
      }

      const matter_id = payload.matter_id ? String(payload.matter_id) : ''
      if (!matter_id) return reply.code(400).send({ error: 'matter_id required' })

      const drafts = Array.isArray(payload.challenge_opinion_drafts) ? payload.challenge_opinion_drafts : []
      if (drafts.length === 0) return reply.code(400).send({ error: 'challenge_opinion_drafts required' })

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

      return reply.code(200).send({ status: 'challenge_document_created', matter_id, created_documents: created })
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
      }

      const matter_id = payload.matter_id ? String(payload.matter_id) : ''
      if (!matter_id) return reply.code(400).send({ error: 'matter_id required' })

      const drafts = Array.isArray(payload.evidence_drafts) ? payload.evidence_drafts : []
      if (drafts.length === 0) return reply.code(400).send({ error: 'evidence_drafts required' })

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

      return reply.code(200).send({ status: 'evidence_created', matter_id, created_evidence: created })
    } finally {
      try {
        await prisma.$disconnect()
      } catch (e) {
        // ignore
      }
    }
  })
}

export default intakeRoutes