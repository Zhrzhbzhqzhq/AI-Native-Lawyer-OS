import type { FastifyInstance } from 'fastify'
import IntakeRuntime, { type IntakeFileMeta, type IntakeSource } from '../runtime/intakeRuntime'

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
}

export default intakeRoutes