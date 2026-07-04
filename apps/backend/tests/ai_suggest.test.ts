import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { buildApp } from '../src/server'
import { createPrismaClient } from '@lawdesk/database'

let app: any
let prisma: any
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`
let testMatterId: string

beforeAll(async () => {
  app = await buildApp()
  await app.listen({ port: 0 })
  prisma = createPrismaClient()

  // cleanup
  await prisma.aiRecord.deleteMany({ where: { ai_record_id: { startsWith: `test-ai-conv-${RUN_ID}` } } })
  testMatterId = `test-matter-ai-${RUN_ID}`
  await prisma.matter.create({ data: { matter_id: testMatterId, title: 'AI Suggest Matter', description: '', matter_type: 'test', status: 'active' } })
})

afterAll(async () => {
  await prisma.aiRecord.deleteMany({ where: { ai_record_id: { startsWith: `test-ai-conv-${RUN_ID}` } } })
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('AI Suggest API', () => {
  it('returns a mock suggestion pack', async () => {
    const res = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/ai/suggest` })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.provider).toBe('mock')
    expect(body.model).toBe('mock-lawdesk-v1')
    expect(body.response).toHaveProperty('summary')
    expect(Array.isArray(body.response.risks)).toBe(true)
    expect(Array.isArray(body.response.next_steps)).toBe(true)
    expect(Array.isArray(body.response.missing_items)).toBe(true)
    expect(Array.isArray(body.response.lawyer_actions)).toBe(true)
  })
})
