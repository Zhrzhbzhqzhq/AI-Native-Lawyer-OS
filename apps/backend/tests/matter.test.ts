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
