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
  // cleanup any previous timeline entries for this run
  await prisma.timeline.deleteMany({ where: { timeline_id: { startsWith: `test-tl-${RUN_ID}` } } })
  // create a test matter to satisfy FK constraints
  testMatterId = `test-matter-${RUN_ID}`
  await prisma.matter.create({ data: { matter_id: testMatterId, title: 'Test Matter', description: '', matter_type: 'test', status: 'active' } })
})

afterAll(async () => {
  await prisma.timeline.deleteMany({ where: { timeline_id: { startsWith: `test-tl-${RUN_ID}` } } })
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('Timeline API', () => {
  it('creates and lists timeline entries for a matter', async () => {
    const matterId = testMatterId
    const timelineId = `test-tl-${RUN_ID}-${Date.now()}`

    // create
    const res = await app.inject({
      method: 'POST',
      url: `/matters/${matterId}/timeline`,
      payload: { timeline_id: timelineId, event_type: 'note', event_time: new Date().toISOString(), description: 'test entry', source: 'test' }
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.timeline_id).toBe(timelineId)
    expect(body.matter_id).toBe(matterId)

    // list
    const listRes = await app.inject({ method: 'GET', url: `/matters/${matterId}/timeline` })
    expect(listRes.statusCode).toBe(200)
    const list = JSON.parse(listRes.body)
    expect(Array.isArray(list)).toBe(true)
    const found = list.find((t: any) => t.timeline_id === timelineId)
    expect(found).toBeTruthy()
  })
})
