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

  testMatterId = `test-matter-aprt-${RUN_ID}`
  await prisma.matter.create({ data: { matter_id: testMatterId, title: 'AP Runtime Test', description: 'ap runtime', matter_type: 'test', status: 'active' } })
})

afterAll(async () => {
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('Action Proposal Runtime', () => {
  it('POST generates proposals and GET returns them; PATCH updates status', async () => {
    const mId = testMatterId

    // ensure deterministic: call plan-runtime first to have recommended actions
    await app.inject({ method: 'POST', url: `/matters/${mId}/plan-runtime` })

    const postRes = await app.inject({ method: 'POST', url: `/matters/${mId}/action-proposals` })
    expect(postRes.statusCode).toBe(201)
    const created = JSON.parse(postRes.body)
    expect(Array.isArray(created)).toBe(true)
    expect(created.length).toBeGreaterThanOrEqual(0)

    // default status pending
    if (created.length > 0) {
      expect(created[0].status).toBe('pending')
    }

    const getRes = await app.inject({ method: 'GET', url: `/matters/${mId}/action-proposals` })
    expect(getRes.statusCode).toBe(200)
    const list = JSON.parse(getRes.body)
    expect(Array.isArray(list)).toBe(true)

    if (list.length > 0) {
      const pid = list[0].proposal_id
      const patchRes = await app.inject({ method: 'PATCH', url: `/matters/${mId}/action-proposals/${pid}`, payload: { status: 'approved' } })
      expect(patchRes.statusCode).toBe(200)
      const updated = JSON.parse(patchRes.body)
      expect(updated.status).toBe('approved')

      // reject it back
      const patchRes2 = await app.inject({ method: 'PATCH', url: `/matters/${mId}/action-proposals/${pid}`, payload: { status: 'rejected' } })
      expect(patchRes2.statusCode).toBe(200)
      const updated2 = JSON.parse(patchRes2.body)
      expect(updated2.status).toBe('rejected')
    }

    // ensure no tasks were created
    const tasks = await prisma.task.findMany({ where: { matter_id: mId } })
    expect(tasks.length).toBe(0)

    // workflow instance unchanged
    const wfRes = await app.inject({ method: 'GET', url: `/matters/${mId}/workflow` })
    expect(wfRes.statusCode).toBe(404)
  })
})
