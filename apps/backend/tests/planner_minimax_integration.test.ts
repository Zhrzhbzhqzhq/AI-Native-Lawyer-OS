import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { buildApp } from '../src/server'
import { createPrismaClient } from '@lawdesk/database'

let app: any
let prisma: any
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
let testMatterId: string

beforeAll(async () => {
  app = await buildApp()
  await app.listen({ port: 0 })
  prisma = createPrismaClient()

  await prisma.aiRecord.deleteMany({ where: { ai_record_id: { startsWith: `test-conv-prt-${RUN_ID}` } } })
  testMatterId = `test-matter-prt-${RUN_ID}`
  await prisma.matter.create({ data: { matter_id: testMatterId, title: 'Planner Runtime Minimax Test', description: '', matter_type: 'test', status: 'active' } })
})

afterAll(async () => {
  await prisma.aiRecord.deleteMany({ where: { ai_record_id: { startsWith: `test-conv-prt-${RUN_ID}` } } })
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('Planner Runtime Minimax integration', () => {
  it('extracts text from minimax anthropic response and falls back when unstructured', async () => {
    // stub ProviderManager to return an adapter that simulates minimax
    process.env.AI_PROVIDER = 'minimax'
    process.env.MINIMAX_AUTH_MODE = 'token_plan'
    process.env.MINIMAX_API_KEY = 'fake'

    // stub fetch used by adapter to return an anthropic-like response
    ;(globalThis as any).fetch = async () => ({ json: async () => ({ content: [{ text: '{"recommended_actions":[{"action":"create_task","title":"AI task","reason":"reason"}]}' }] }) })

    const res = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/plan-runtime` })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.provider).toBe('minimax')
    expect(Array.isArray(body.recommended_actions)).toBe(true)
    expect(body.recommended_actions[0].action).toBe('create_task')

    // now simulate unstructured text
    ;(globalThis as any).fetch = async () => ({ json: async () => ({ content: [{ text: 'Consider assigning an investigator to collect bank records' }] }) })
    const res2 = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/plan-runtime` })
    expect(res2.statusCode).toBe(200)
    const body2 = JSON.parse(res2.body)
    expect(Array.isArray(body2.recommended_actions)).toBe(true)
    expect(body2.recommended_actions[0].action).toBe('create_task')
  })
})
