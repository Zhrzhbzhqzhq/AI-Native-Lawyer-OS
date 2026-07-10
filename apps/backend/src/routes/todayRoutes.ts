import { FastifyInstance } from 'fastify'
import { createPrismaClient } from '@lawdesk/database'
import TodayService from '../services/today/todayService'
import ChiefService from '../services/chiefService'

export async function todayRoutes(app: FastifyInstance) {
    const prisma = createPrismaClient()
    const todayService = new TodayService(prisma)

    app.get('/today/dashboard', async (request, reply) => {
        const { limit } = request.query as { limit?: number | string }
        const parsedLimit = Number(limit)
        const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
            ? Math.min(100, Math.floor(parsedLimit))
            : 20

        try {
            const data = await todayService.getDashboard({ limit: safeLimit })
            return reply.code(200).send(data)
        } catch (err: any) {
            request.log.error({ err }, 'today dashboard failed')
            return reply.code(500).send({ error: 'today_dashboard_failed' })
        }
    })

    app.get('/today/runtime', async (request, reply) => {
        const prisma = createPrismaClient()
        const chief = new ChiefService(prisma)
        try {
            const data = await chief.generateTodayRuntime()
            return reply.code(200).send(data)
        } catch (err: any) {
            request.log.error({ err }, 'today runtime failed')
            return reply.code(500).send({ error: 'today_runtime_failed' })
        }
    })
}

export default todayRoutes