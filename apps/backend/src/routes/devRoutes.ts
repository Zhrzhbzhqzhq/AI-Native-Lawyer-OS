import type { FastifyInstance } from 'fastify'
import { createPrismaClient } from '@lawdesk/database'
import DevMatterPurgeService from '../services/devMatterPurgeService'

type DevRoutesOptions = {
  prisma?: ReturnType<typeof createPrismaClient>
}

function purgeDisabled() {
  return process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_PURGE !== 'true'
}

function resetDisabled() {
  return process.env.NODE_ENV !== 'development' || process.env.ENABLE_DEV_RESET !== 'true'
}

export async function devRoutes(app: FastifyInstance, opts: DevRoutesOptions = {}) {
  const prisma = opts.prisma || createPrismaClient()
  const service = new DevMatterPurgeService(prisma)

  const handler = async (request: any, reply: any) => {
    if (purgeDisabled()) {
      return reply.code(process.env.NODE_ENV === 'production' ? 404 : 403).send({ error: 'dev_purge_disabled' })
    }

    const { matter_id } = request.params as { matter_id: string }
    const payload = (request.body || {}) as { confirm?: string; matter_id?: string }

    if (payload.confirm !== 'PURGE_MATTER' || payload.matter_id !== matter_id) {
      return reply.code(400).send({ error: 'purge_confirmation_required' })
    }

    try {
      const result = await service.purgeMatter(matter_id)
      const allClear = Object.values(result.remaining).every((count) => count === 0)
      return reply.code(result.found ? 200 : 404).send({
        ...result,
        purged: result.found && allClear,
      })
    } catch (err: any) {
      return reply.code(500).send({ error: 'purge_failed', detail: err?.message || String(err) })
    }
  }

  app.post('/dev/matters/:matter_id/purge', handler)
  app.delete('/dev/matters/:matter_id/purge', handler)

  app.post('/dev/reset', async (_request, reply) => {
    if (resetDisabled()) {
      return reply.code(403).send({ error: 'dev_reset_disabled' })
    }

    try {
      const result = await service.resetBusinessData()
      return reply.code(200).send(result)
    } catch (err: any) {
      return reply.code(500).send({ error: 'dev_reset_failed', detail: err?.message || String(err) })
    }
  })
}

export default devRoutes
