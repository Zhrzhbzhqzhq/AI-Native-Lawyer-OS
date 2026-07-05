import type { FastifyInstance } from 'fastify'
import { createPrismaClient } from '@lawdesk/database'
import ExecutionService from '../execution/executionService'

export default async function executionRoutes(app: FastifyInstance) {
  const prisma = createPrismaClient()
  const service = new ExecutionService(prisma)

  app.get('/matters/:matter_id/execution', async (request, reply) => {
    const { matter_id } = request.params as any
    try {
      const list = await service.loadQueueState(matter_id)
      // normalize response shape
      const mapped = (Array.isArray(list) ? list : []).map((r: any) => ({
        queue_id: r.queue_id,
        action_id: r.action_id,
        work_id: r.work_id ?? null,
        execution_status: r.execution_status,
      }))
      return reply.code(200).send(mapped)
    } catch (err: any) {
      return reply.code(500).send({ error: 'failed', detail: err?.message || String(err) })
    }
  })

  app.patch('/matters/:matter_id/execution/:queue_id', async (request, reply) => {
    const { queue_id, matter_id } = request.params as any
    const payload = request.body as any
    if (!payload || !payload.operation) return reply.code(400).send({ error: 'operation required' })
    try {
      let res: any
      if (payload.operation === 'start') res = await service.start(matter_id, queue_id)
      else if (payload.operation === 'pause') res = await service.pause(matter_id, queue_id)
      else if (payload.operation === 'complete') res = await service.complete(matter_id, queue_id)
      else return reply.code(400).send({ error: 'invalid operation' })

      return reply.code(200).send({ queue_id: res.queue_id, execution_status: res.execution_status })
    } catch (err: any) {
      if (String(err) === 'Error: Not found') {
        // create initial persisted row using provided body fields, then retry operation
        try {
          const action_id = payload.action_id ?? queue_id
          const work_id = payload.work_id ?? null
          const slot = payload.slot ?? 'NOW'
          await service.saveQueueItem({ matter_id, queue_id, action_id, work_id, slot, execution_status: 'PENDING' })

          // retry the requested operation via ExecutionService
          let retryRes: any
          if (payload.operation === 'start') retryRes = await service.start(matter_id, queue_id)
          else if (payload.operation === 'pause') retryRes = await service.pause(matter_id, queue_id)
          else if (payload.operation === 'complete') retryRes = await service.complete(matter_id, queue_id)
          else return reply.code(400).send({ error: 'invalid operation' })

          return reply.code(200).send({ queue_id: retryRes.queue_id, execution_status: retryRes.execution_status })
        } catch (e: any) {
          if (String(e) === 'Error: Not found') return reply.code(404).send({ error: 'not found' })
          return reply.code(500).send({ error: 'failed', detail: e?.message || String(e) })
        }
      }
      return reply.code(500).send({ error: 'failed', detail: err?.message || String(err) })
    }
  })
}
