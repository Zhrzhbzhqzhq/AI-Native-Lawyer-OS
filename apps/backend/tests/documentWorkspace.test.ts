import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import fetch from 'node-fetch'
import buildApp from '../src/server'
import { createPrismaClient } from '@lawdesk/database'

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`
const TEST_ID = `test-document-ws-${RUN_ID}`

let app: any
let BASE = ''

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://qingzhang@localhost:5432/lawdesk'
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

describe('Document Workspace Read-only', () => {
  it('GET /matters/:id/documents/workspace returns structured read-only dashboard', async () => {
    const WORK_ID = `${TEST_ID}-1`

    // create matter
    const post = await fetch(`${BASE}/matters`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: WORK_ID, title: 'Document WS Test' }) })
    expect(post.status).toBe(201)

    // optional: create a document fixture
    const docId = `${WORK_ID}-doc-1`
    const docRes = await fetch(`${BASE}/matters/${WORK_ID}/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document_id: docId, title: 'Doc 1', document_type: 'contract', content_uri: '', status: 'draft' }) })
    expect(docRes.status).toBe(201)

    // counts before
    const prisma = createPrismaClient()
    const beforeDocuments = await prisma.document.count({ where: { matter_id: WORK_ID } })
    const beforeEvidence = await prisma.evidence.count({ where: { matter_id: WORK_ID } })
    const beforeTimeline = await prisma.timeline.count({ where: { matter_id: WORK_ID } }).catch(() => 0)
    await prisma.$disconnect()

    const res = await fetch(`${BASE}/matters/${WORK_ID}/documents/workspace`)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body).toBeTruthy()
    expect(body.matter).toBeTruthy()
    expect(body.matter.matter_id).toBe(WORK_ID)
    expect(body.summary).toBeTruthy()
    expect(typeof body.summary.total).toBe('number')
    expect(typeof body.summary.completed).toBe('number')
    expect(typeof body.summary.draft).toBe('number')
    expect(typeof body.summary.need_review).toBe('number')
    expect(typeof body.summary.missing).toBe('number')

    expect(Array.isArray(body.document_list)).toBe(true)
    // selected_document should be present (first document)
    expect(body.selected_document).toBeTruthy()
    expect(typeof body.selected_document.document_id).toBe('string')
    expect(typeof body.selected_document.title).toBe('string')
    expect(typeof body.selected_document.document_type).toBe('string')
    expect(typeof body.selected_document.status).toBe('string')
    expect('updated_at' in body.selected_document).toBe(true)
    expect(Array.isArray(body.selected_document.related_materials)).toBe(true)
    expect(Array.isArray(body.selected_document.related_evidence)).toBe(true)
    expect(body.selected_document.lawyer_notes).toBeTruthy()
    expect(body.selected_document.ai_summary).toBeTruthy()
    expect(typeof body.selected_document.ai_summary.score).toBe('number')
    expect(body.ai_analysis).toBeTruthy()
    expect(Array.isArray(body.missing_documents)).toBe(true)
    expect(Array.isArray(body.document_next_steps)).toBe(true)

    // navigation checks
    expect(body.navigation).toBeTruthy()
    expect(Array.isArray(body.navigation.by_type)).toBe(true)
    expect(Array.isArray(body.navigation.by_status)).toBe(true)
    expect(Array.isArray(body.navigation.by_version)).toBe(true)
    for (const grp of ['by_type','by_status','by_version']) {
      for (const item of body.navigation[grp]) {
        expect(typeof item.key).toBe('string')
        expect(typeof item.label).toBe('string')
        expect(typeof item.description).toBe('string')
        expect(typeof item.count).toBe('number')
      }
    }

    // counts after - ensure no new objects were created by endpoint
    const prisma2 = createPrismaClient()
    const afterDocuments = await prisma2.document.count({ where: { matter_id: WORK_ID } })
    const afterEvidence = await prisma2.evidence.count({ where: { matter_id: WORK_ID } })
    const afterTimeline = await prisma2.timeline.count({ where: { matter_id: WORK_ID } }).catch(() => 0)
    await prisma2.$disconnect()

    expect(afterDocuments - beforeDocuments).toBe(0)
    expect(afterEvidence - beforeEvidence).toBe(0)
    expect(afterTimeline - beforeTimeline).toBe(0)

    // cleanup
    await fetch(`${BASE}/matters/${WORK_ID}`, { method: 'DELETE' })
  })
})
