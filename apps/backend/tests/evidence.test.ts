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
  // cleanup any previous evidence entries for this run
  await prisma.evidence.deleteMany({ where: { evidence_id: { startsWith: `test-ev-${RUN_ID}` } } })
  // create a test matter to satisfy FK constraints
  testMatterId = `test-matter-${RUN_ID}`
  await prisma.matter.create({ data: { matter_id: testMatterId, title: 'Test Matter', description: '', matter_type: 'test', status: 'active' } })
  // create a test material to satisfy Evidence.material_id FK
  await prisma.material.create({ data: { material_id: `mat-${testMatterId}`, matter_id: testMatterId, title: 'Test Material', material_type: 'generic', source: '', storage_uri: '', status: 'active' } })
})

afterAll(async () => {
  await prisma.evidence.deleteMany({ where: { evidence_id: { startsWith: `test-ev-${RUN_ID}` } } })
  await prisma.material.deleteMany({ where: { material_id: { startsWith: `mat-${testMatterId}` } } })
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('Evidence API', () => {
  it('creates and lists evidence for a matter', async () => {
    const matterId = testMatterId
    const evidenceId = `test-ev-${RUN_ID}-${Date.now()}`
    const materialId = `mat-${matterId}`

    // create
    const res = await app.inject({
      method: 'POST',
      url: `/matters/${matterId}/evidence`,
      payload: { evidence_id: evidenceId, material_id: materialId, title: 'test evidence', evidence_type: 'photo', description: 'test evidence', relevance: 'high' }
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.evidence_id).toBe(evidenceId)
    expect(body.matter_id).toBe(matterId)

    // list
    const listRes = await app.inject({ method: 'GET', url: `/matters/${matterId}/evidence` })
    expect(listRes.statusCode).toBe(200)
    const list = JSON.parse(listRes.body)
    expect(Array.isArray(list)).toBe(true)
    const found = list.find((t: any) => t.evidence_id === evidenceId)
    expect(found).toBeTruthy()
  })
})
