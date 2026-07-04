import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { buildApp } from '../src/server'
import { createPrismaClient } from '@lawdesk/database'

let app: any
let prisma: any
const testMatterId = `test-matter-plan-${Date.now()}`

beforeAll(async () => {
  app = await buildApp()
  await app.listen({ port: 0 })
  prisma = createPrismaClient()
  await prisma.matter.create({ data: { matter_id: testMatterId, title: 'Plan Matter', description: '', matter_type: 'test', status: 'active' } })
})

afterAll(async () => {
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('Planner API', () => {
  it('returns a structured plan from mock LLM', async () => {
    const res = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/plan` })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.matter_id).toBe(testMatterId)
    expect(Array.isArray(body.recommended_actions)).toBe(true)
    expect(Array.isArray(body.missing_items)).toBe(true)
    expect(Array.isArray(body.risks)).toBe(true)
    expect(body.generated_at).toBeTruthy()
  })
})
