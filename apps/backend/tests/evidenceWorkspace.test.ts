import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import fetch from 'node-fetch'
import buildApp from '../src/server'
import { createPrismaClient } from '@lawdesk/database'

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`
const TEST_ID = `test-evidence-ws-${RUN_ID}`

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

describe('Evidence Workspace Read-only', () => {
  it('GET /matters/:id/evidence/workspace returns structured read-only dashboard', async () => {
    const WORK_ID = `${TEST_ID}-1`

    // create matter
    const post = await fetch(`${BASE}/matters`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: WORK_ID, title: 'Evidence WS Test' }) })
    expect(post.status).toBe(201)

    // create a material to attach evidence to
    const mid = `${WORK_ID}-mat-1`
    const mres = await fetch(`${BASE}/matters/${WORK_ID}/materials`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ material_id: mid, title: 'Source Material' }) })
    expect(mres.status).toBe(201)

    // create sample evidence entries
    const e1 = await fetch(`${BASE}/matters/${WORK_ID}/evidence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evidence_id: `${WORK_ID}-ev-1`, material_id: mid, title: 'Ev 1', evidence_type: 'screenshot', description: 'desc', status: 'accepted', relevance: 'high' }) })
    expect(e1.status).toBe(201)
    const e2 = await fetch(`${BASE}/matters/${WORK_ID}/evidence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evidence_id: `${WORK_ID}-ev-2`, material_id: mid, title: 'Ev 2', evidence_type: 'contract', description: '', status: 'pending', relevance: '' }) })
    expect(e2.status).toBe(201)

    // counts before
    const prisma = createPrismaClient()
    const beforeEvidence = await prisma.evidence.count({ where: { matter_id: WORK_ID } })
    const beforeDocuments = await prisma.document.count({ where: { matter_id: WORK_ID } })
    const beforeTimeline = await prisma.timeline.count({ where: { matter_id: WORK_ID } }).catch(() => 0)
    await prisma.$disconnect()

    const res = await fetch(`${BASE}/matters/${WORK_ID}/evidence/workspace`)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body).toBeTruthy()
    expect(body.matter).toBeTruthy()
    expect(body.matter.matter_id).toBe(WORK_ID)
    expect(body.summary).toBeTruthy()
    expect(typeof body.summary.total).toBe('number')
    expect(typeof body.summary.accepted).toBe('number')
    expect(typeof body.summary.pending).toBe('number')
    expect(typeof body.summary.weak).toBe('number')
    expect(typeof body.summary.missing).toBe('number')

    expect(Array.isArray(body.evidence_list)).toBe(true)
    expect(body.selected_evidence).not.toBeNull()
    const se = body.selected_evidence
    expect(typeof se.evidence_id).toBe('string')
    expect(typeof se.title).toBe('string')
    expect(typeof se.evidence_type).toBe('string')
    expect(typeof se.status).toBe('string')
    expect(typeof se.relevance).toBe('string')
    expect(typeof se.description).toBe('string')
    expect(typeof se.source).toBe('string')
    expect(se.updated_at === null || typeof se.updated_at === 'string').toBe(true)
    expect(se.related_material === null || (typeof se.related_material === 'object' && typeof se.related_material.title === 'string')).toBe(true)
    expect(Array.isArray(se.related_documents)).toBe(true)
    expect(Array.isArray(se.related_timeline)).toBe(true)
    expect(se.lawyer_notes).toBeTruthy()
    expect(se.lawyer_notes.status).toBe('read_only')
    expect(se.ai_summary).toBeTruthy()
    expect(se.ai_summary.status).toBe('placeholder')
    expect(body.ai_analysis).toBeTruthy()
    expect(Array.isArray(body.missing_evidence)).toBe(true)

    // navigation checks
    expect(body.navigation).toBeTruthy()
    expect(Array.isArray(body.navigation.by_type)).toBe(true)
    expect(Array.isArray(body.navigation.by_status)).toBe(true)
    expect(Array.isArray(body.navigation.by_strength)).toBe(true)
    for (const grp of ['by_type','by_status','by_strength']) {
      for (const item of body.navigation[grp]) {
        expect(typeof item.key).toBe('string')
        expect(typeof item.label).toBe('string')
        expect(typeof item.description).toBe('string')
        expect(typeof item.count).toBe('number')
      }
    }

    // counts after - ensure no new objects were created by endpoint
    const prisma2 = createPrismaClient()
    const afterEvidence = await prisma2.evidence.count({ where: { matter_id: WORK_ID } })
    const afterDocuments = await prisma2.document.count({ where: { matter_id: WORK_ID } })
    const afterTimeline = await prisma2.timeline.count({ where: { matter_id: WORK_ID } }).catch(() => 0)
    await prisma2.$disconnect()

    expect(afterEvidence - beforeEvidence).toBe(0)
    expect(afterDocuments - beforeDocuments).toBe(0)
    expect(afterTimeline - beforeTimeline).toBe(0)

    // cleanup
    await fetch(`${BASE}/matters/${WORK_ID}`, { method: 'DELETE' })
  })
})
