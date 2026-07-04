import type { FastifyInstance } from 'fastify'
import { createPrismaClient } from '@lawdesk/database'
import IntakeRuntime, { type IntakeFileMeta, type IntakeSource } from '../runtime/intakeRuntime'
import MaterialService from '../services/materialService'

function genId(prefix = 'ij-') {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function intakeRoutes(app: FastifyInstance) {
  const runtime = new IntakeRuntime()
  const allowedSources: IntakeSource[] = ['Plaintiff', 'Opponent', 'Court', 'Third Party']

  app.post('/intake', async (request, reply) => {
    const payload = (request.body || {}) as {
      files?: IntakeFileMeta[]
      matter_id?: string
      source?: string
    }

    const files = Array.isArray(payload.files) ? payload.files : []
    const matter_id = payload.matter_id ? String(payload.matter_id) : null
    const source = String(payload.source || '') as IntakeSource

    if (files.length === 0) {
      return reply.code(400).send({ error: 'files required' })
    }

    if (!allowedSources.includes(source)) {
      return reply.code(400).send({ error: 'invalid source' })
    }

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
}

export default intakeRoutes