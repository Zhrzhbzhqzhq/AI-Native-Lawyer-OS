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
  await prisma.document.deleteMany({ where: { document_id: { startsWith: `test-doc-${RUN_ID}` } } })
  testMatterId = `test-matter-${RUN_ID}`
  await prisma.matter.create({ data: { matter_id: testMatterId, title: 'Test Matter', description: '', matter_type: 'test', status: 'active' } })
})

afterAll(async () => {
  await prisma.document.deleteMany({ where: { document_id: { startsWith: `test-doc-${RUN_ID}` } } })
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('Documents API', () => {
  it('creates, lists, and deletes documents for a matter', async () => {
    const matterId = testMatterId
    const documentId = `test-doc-${RUN_ID}-${Date.now()}`

    // create
    const res = await app.inject({ method: 'POST', url: `/matters/${matterId}/documents`, payload: { document_id: documentId, title: 'Test Document', document_type: 'contract', content_uri: '', status: 'draft' } })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.document_id).toBe(documentId)
    expect(body.matter_id).toBe(matterId)

    // list
    const listRes = await app.inject({ method: 'GET', url: `/matters/${matterId}/documents` })
    expect(listRes.statusCode).toBe(200)
    const list = JSON.parse(listRes.body)
    expect(Array.isArray(list)).toBe(true)
    const found = list.find((t: any) => t.document_id === documentId)
    expect(found).toBeTruthy()

    // delete
    const delRes = await app.inject({ method: 'DELETE', url: `/matters/${matterId}/documents/${documentId}` })
    expect(delRes.statusCode).toBe(204)

    // list again - should not find
    const listRes2 = await app.inject({ method: 'GET', url: `/matters/${matterId}/documents` })
    const list2 = JSON.parse(listRes2.body)
    const found2 = list2.find((t: any) => t.document_id === documentId)
    expect(found2).toBeFalsy()
  })
})
