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
  // cleanup any previous materials entries for this run
  await prisma.material.deleteMany({ where: { material_id: { startsWith: `test-mat-${RUN_ID}` } } })
  // create a test matter to satisfy FK constraints
  testMatterId = `test-matter-${RUN_ID}`
  await prisma.matter.create({ data: { matter_id: testMatterId, title: 'Test Matter', description: '', matter_type: 'test', status: 'active' } })
})

afterAll(async () => {
  await prisma.material.deleteMany({ where: { material_id: { startsWith: `test-mat-${RUN_ID}` } } })
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('Materials API', () => {
  it('creates, lists, and deletes materials for a matter', async () => {
    const matterId = testMatterId
    const materialId = `test-mat-${RUN_ID}-${Date.now()}`

    // create
    const res = await app.inject({ method: 'POST', url: `/matters/${matterId}/materials`, payload: { material_id: materialId, title: 'Test Material', material_type: 'generic', source: 'test', storage_uri: '' } })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.material_id).toBe(materialId)
    expect(body.matter_id).toBe(matterId)

    // list
    const listRes = await app.inject({ method: 'GET', url: `/matters/${matterId}/materials` })
    expect(listRes.statusCode).toBe(200)
    const list = JSON.parse(listRes.body)
    expect(Array.isArray(list)).toBe(true)
    const found = list.find((t: any) => t.material_id === materialId)
    expect(found).toBeTruthy()

    // delete
    const delRes = await app.inject({ method: 'DELETE', url: `/matters/${matterId}/materials/${materialId}` })
    expect(delRes.statusCode).toBe(204)

    // list again - should not find
    const listRes2 = await app.inject({ method: 'GET', url: `/matters/${matterId}/materials` })
    const list2 = JSON.parse(listRes2.body)
    const found2 = list2.find((t: any) => t.material_id === materialId)
    expect(found2).toBeFalsy()
  })
})
