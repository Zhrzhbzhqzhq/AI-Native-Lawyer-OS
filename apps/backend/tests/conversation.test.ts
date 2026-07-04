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
  await prisma.aiRecord.deleteMany({ where: { ai_record_id: { startsWith: `test-conv-${RUN_ID}` } } })
  testMatterId = `test-matter-${RUN_ID}`
  await prisma.matter.create({ data: { matter_id: testMatterId, title: 'Test Matter', description: '', matter_type: 'test', status: 'active' } })
})

afterAll(async () => {
  await prisma.aiRecord.deleteMany({ where: { ai_record_id: { startsWith: `test-conv-${RUN_ID}` } } })
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('Conversation API', () => {
  it('creates, lists, and deletes conversation messages for a matter', async () => {
    const matterId = testMatterId
    const messageId = `test-conv-${RUN_ID}-${Date.now()}`

    // create user message
    const res = await app.inject({ method: 'POST', url: `/matters/${matterId}/conversation`, payload: { message_id: messageId, role: 'user', content: 'hello' } })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.ai_record_id).toBe(messageId)
    expect(body.matter_id).toBe(matterId)

    // list
    const listRes = await app.inject({ method: 'GET', url: `/matters/${matterId}/conversation` })
    expect(listRes.statusCode).toBe(200)
    const list = JSON.parse(listRes.body)
    expect(Array.isArray(list)).toBe(true)
    const found = list.find((t: any) => t.ai_record_id === messageId)
    expect(found).toBeTruthy()

    // delete
    const delRes = await app.inject({ method: 'DELETE', url: `/matters/${matterId}/conversation/${messageId}` })
    expect(delRes.statusCode).toBe(204)

    // list again - should not find
    const listRes2 = await app.inject({ method: 'GET', url: `/matters/${matterId}/conversation` })
    const list2 = JSON.parse(listRes2.body)
    const found2 = list2.find((t: any) => t.ai_record_id === messageId)
    expect(found2).toBeFalsy()
  })
})
