import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import fetch from 'node-fetch'
import buildApp from '../src/server'
import { createPrismaClient } from '@lawdesk/database'

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`
const TEST_ID = `test-matter-ci-${RUN_ID}`

let app: any
let BASE = ''

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://qingzhang@localhost:5432/lawdesk'
  // ensure any previous test matter with this exact id is removed (idempotency)
  const prisma = createPrismaClient()
  try {
    await prisma.matter.deleteMany({ where: { matter_id: TEST_ID } })
  } finally {
    await prisma.$disconnect()
  }

  app = await buildApp()
  await app.listen({ port: 0 })
  const addr: any = app.server.address()
  const port = addr && addr.port ? addr.port : 4000
  BASE = `http://127.0.0.1:${port}`
})

afterAll(async () => {
  // cleanup test matter created by this suite
  try {
    await fetch(`${BASE}/matters/${TEST_ID}`, { method: 'DELETE' })
  } catch (e) {}
  const prisma = createPrismaClient()
  try {
    await prisma.matter.deleteMany({ where: { matter_id: TEST_ID } })
  } finally {
    await prisma.$disconnect()
  }
  await app.close()
})

describe('Matter CRUD', () => {
  it('creates, lists, gets, updates, soft-deletes a matter', async () => {
    const post = await fetch(`${BASE}/matters`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: TEST_ID, title: 'CI Test' }) })
    expect(post.status).toBe(201)
    const created = await post.json()
    expect(created.matter_id).toBe(TEST_ID)

    const get = await fetch(`${BASE}/matters/${TEST_ID}`)
    expect(get.status).toBe(200)
    const got = await get.json()
    expect(got.matter_id).toBe(TEST_ID)

    const patch = await fetch(`${BASE}/matters/${TEST_ID}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: 'from test' }) })
    expect(patch.status).toBe(200)
    const patched = await patch.json()
    expect(patched.description).toBe('from test')

    const del = await fetch(`${BASE}/matters/${TEST_ID}`, { method: 'DELETE' })
    expect(del.status).toBe(204)

    const get2 = await fetch(`${BASE}/matters/${TEST_ID}`)
    expect(get2.status).toBe(404)
  })
})

describe('Matter Workspace Read-only', () => {
  it('GET /matters/:id/workspace returns summary and recent arrays and does not create objects', async () => {
    const WORK_ID = `${TEST_ID}-ws`

    // create a matter to inspect
    const post = await fetch(`${BASE}/matters`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: WORK_ID, title: 'Workspace Test' }) })
    expect(post.status).toBe(201)

    // counts before
    const prisma = createPrismaClient()
    const beforeMaterials = await prisma.material.count({ where: { matter_id: WORK_ID } })
    const beforeEvidence = await prisma.evidence.count({ where: { matter_id: WORK_ID } })
    const beforeDocuments = await prisma.document.count({ where: { matter_id: WORK_ID } })
    await prisma.$disconnect()

    const res = await fetch(`${BASE}/matters/${WORK_ID}/workspace`)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body).toBeTruthy()
    expect(body.matter).toBeTruthy()
    expect(body.matter.matter_id).toBe(WORK_ID)
    expect(body.summary).toBeTruthy()
    expect(typeof body.summary.materials).toBe('number')
    expect(typeof body.summary.evidence).toBe('number')
    expect(typeof body.summary.documents).toBe('number')
    expect(typeof body.summary.pending_ai_suggestions).toBe('number')

    expect(Array.isArray(body.recent_materials)).toBe(true)
    expect(Array.isArray(body.recent_evidence)).toBe(true)
    expect(Array.isArray(body.recent_documents)).toBe(true)

    // object_navigation exists and contains expected items
    expect(Array.isArray(body.object_navigation)).toBe(true)
    const keys = body.object_navigation.map((o: any) => o.key).sort()
    expect(keys).toEqual(['documents','evidence','materials'])
    for (const o of body.object_navigation) {
      expect(typeof o.key).toBe('string')
      expect(typeof o.label).toBe('string')
      expect(typeof o.description).toBe('string')
      expect(typeof o.href).toBe('string')
      expect(typeof o.count).toBe('number')
    }

    // recent_activity exists and items have required fields
    expect(Array.isArray(body.recent_activity)).toBe(true)
    for (const a of body.recent_activity) {
      expect(typeof a.type).toBe('string')
      expect(typeof a.title).toBe('string')
      expect(typeof a.description).toBe('string')
      expect(typeof a.time).toBe('string')
      // time should be parseable
      expect(Number.isFinite(Date.parse(a.time))).toBe(true)
    }

    // counts after - ensure no new objects were created by the workspace endpoint
    const prisma2 = createPrismaClient()
    const afterMaterials = await prisma2.material.count({ where: { matter_id: WORK_ID } })
    const afterEvidence = await prisma2.evidence.count({ where: { matter_id: WORK_ID } })
    const afterDocuments = await prisma2.document.count({ where: { matter_id: WORK_ID } })
    await prisma2.$disconnect()

    expect(afterMaterials - beforeMaterials).toBe(0)
    expect(afterEvidence - beforeEvidence).toBe(0)
    expect(afterDocuments - beforeDocuments).toBe(0)

    // cleanup
    await fetch(`${BASE}/matters/${WORK_ID}`, { method: 'DELETE' })
  })
})
