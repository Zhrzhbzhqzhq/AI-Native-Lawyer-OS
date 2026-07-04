import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { buildApp } from '../src/server'
import { createPrismaClient } from '@lawdesk/database'

let app: any
let prisma: any
const testMatterId = `test-matter-wfi-${Date.now()}`

beforeAll(async () => {
  app = await buildApp()
  await app.listen({ port: 0 })
  prisma = createPrismaClient()
  await prisma.matter.create({ data: { matter_id: testMatterId, title: 'WFI Matter', description: '', matter_type: 'test', status: 'active' } })
})

afterAll(async () => {
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('Matter Workflow Runtime', () => {
  it('start, get, advance workflow instance', async () => {
    const startRes = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/workflow/start` })
    expect(startRes.statusCode).toBe(201)
    const body = JSON.parse(startRes.body)
    expect(body.matter_id).toBe(testMatterId)
    expect(body.current_stage).toBeTruthy()

    const getRes = await app.inject({ method: 'GET', url: `/matters/${testMatterId}/workflow` })
    expect(getRes.statusCode).toBe(200)

    const advRes = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/workflow/advance` })
    expect(advRes.statusCode).toBe(200)
    const advBody = JSON.parse(advRes.body)
    expect(advBody.completed_steps.length).toBeGreaterThanOrEqual(1)
  })
})
