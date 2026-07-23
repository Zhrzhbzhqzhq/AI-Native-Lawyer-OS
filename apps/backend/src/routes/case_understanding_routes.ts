import type { FastifyInstance } from 'fastify'
import { createPrismaClient } from '@lawdesk/database'
import CaseUnderstandingProductService from '../services/context_engine/case_understanding_product_service'

function errorCode(error: unknown) {
  const candidate = error as { code?: unknown; message?: unknown }
  return String(candidate?.code || candidate?.message || 'case_understanding_failed')
}

export async function caseUnderstandingRoutes(app: FastifyInstance) {
  const service = new CaseUnderstandingProductService(createPrismaClient())

  app.post('/matters/:matter_id/case-understanding/generate', async (request, reply) => {
    const { matter_id } = request.params as { matter_id: string }
    try {
      return reply.code(200).send(await service.generate(matter_id))
    } catch (error) {
      const code = errorCode(error)
      if (code === 'matter_not_found') return reply.code(404).send({ error: code })
      if (code === 'case_understanding_already_running') return reply.code(409).send({ error: code })
      if (code === 'context_snapshot_incomplete' || code === 'case_understanding_contract_invalid') {
        return reply.code(422).send({ error: code })
      }
      if (code === 'case_understanding_generation_failed') return reply.code(502).send({ error: code })
      return reply.code(500).send({ error: 'case_understanding_generate_failed' })
    }
  })

  app.get('/matters/:matter_id/case-understanding/latest', async (request, reply) => {
    const { matter_id } = request.params as { matter_id: string }
    try {
      return reply.code(200).send(await service.latest(matter_id))
    } catch (error) {
      const code = errorCode(error)
      if (code === 'matter_not_found' || code === 'case_understanding_not_found') {
        return reply.code(404).send({ error: code })
      }
      if (code === 'case_understanding_contract_invalid' || code === 'case_understanding_result_uri_invalid') {
        return reply.code(422).send({ error: code })
      }
      return reply.code(500).send({ error: 'case_understanding_latest_failed' })
    }
  })
}

export default caseUnderstandingRoutes
