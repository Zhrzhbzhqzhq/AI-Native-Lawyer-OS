import Fastify from 'fastify'
import cors from '@fastify/cors'
import { createPrismaClient } from '@lawdesk/database'
import matterRoutes from './routes/matterRoutes'
import intakeRoutes from './routes/intakeRoutes'
import executionRoutes from './routes/executionRoutes'
import aiRoutes from './routes/aiRoutes'

export async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: true })

  app.get('/health', async () => ({ status: 'ok', service: 'backend' }))

  app.get('/health/db', async () => {
    try {
      const prisma = createPrismaClient()
      await prisma.$queryRaw`SELECT 1`
      return { status: 'ok', db: 'connected' }
    } catch (err: any) {
      const message = err?.message || String(err)
      if (message.includes('Environment variable not found: DATABASE_URL')) {
        return { status: 'error', db: 'not_configured', message: 'DATABASE_URL not set' }
      }
      return { status: 'error', db: 'unreachable', message }
    }
  })

  await app.register(matterRoutes)
  await app.register(intakeRoutes)
  await app.register(executionRoutes)
  await app.register(aiRoutes)

  return app
}

export default buildApp
