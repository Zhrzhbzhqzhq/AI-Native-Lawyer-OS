import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import fetch from 'node-fetch'

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`
const TEST_ID = `test-evidence-ws-${RUN_ID}`

let app: any
let BASE = ''
let prisma: any

function requireRcTestDatabase() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL_required_for_rc_tests')
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, '')
  if (databaseName !== 'lawdesk_rc_test') throw new Error(`unsafe_test_database:${databaseName}`)
}

beforeAll(async () => {
  requireRcTestDatabase()
  const { createPrismaClient } = await import('@lawdesk/database')
  const { default: buildApp } = await import('../src/server')
  prisma = createPrismaClient()
  await prisma.matter.deleteMany({ where: { matter_id: TEST_ID } })

  app = await buildApp()
  await app.listen({ port: 0 })
  const addr: any = app.server.address()
  const port = addr && addr.port ? addr.port : 4000
  BASE = `http://127.0.0.1:${port}`
})

afterAll(async () => {
  if (app) try {
    await fetch(`${BASE}/matters/${TEST_ID}`, { method: 'DELETE' })
  } catch (e) {}
  if (prisma) try {
    await prisma.matter.deleteMany({ where: { matter_id: TEST_ID } })
  } finally {
    await prisma.$disconnect()
  }
  if (app) await app.close()
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
    const mid2 = `${WORK_ID}-mat-2`
    const mres2 = await fetch(`${BASE}/matters/${WORK_ID}/materials`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ material_id: mid2, title: '005_借条.md' }) })
    expect(mres2.status).toBe(201)

    // create sample evidence entries
    const e1 = await fetch(`${BASE}/matters/${WORK_ID}/evidence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evidence_id: `${WORK_ID}-ev-1`, material_id: mid, title: 'Ev 1', evidence_type: 'screenshot', description: 'desc', status: 'accepted', relevance: 'high' }) })
    expect(e1.status).toBe(201)
    const e2 = await fetch(`${BASE}/matters/${WORK_ID}/evidence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evidence_id: `${WORK_ID}-ev-2`, material_id: mid, title: 'Ev 2', evidence_type: 'contract', description: '', status: 'pending', relevance: '' }) })
    expect(e2.status).toBe(201)
    const publishDescription = [
      '摘要：借条、聊天与咨询记录共同指向借款合意。',
      '证明目标：证明双方达成民间借贷合意',
      'AI判断理由：多份材料可相互印证借款关系成立。',
      '可信度：0.95',
      `来源材料ID：${mid}, ${mid2}`,
      '来源材料：001_客户咨询记录.md、005_借条.md',
    ].join('\n')
    const e3 = await fetch(`${BASE}/matters/${WORK_ID}/evidence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evidence_id: `${WORK_ID}-ev-3`, material_id: mid, title: '借贷合意证据', evidence_type: 'document', description: publishDescription, status: 'active', relevance: '证明双方达成民间借贷合意' }) })
    expect(e3.status).toBe(201)

    // counts before
    const beforeEvidence = await prisma.evidence.count({ where: { matter_id: WORK_ID } })
    const beforeDocuments = await prisma.document.count({ where: { matter_id: WORK_ID } })
    const beforeTimeline = await prisma.timeline.count({ where: { matter_id: WORK_ID } }).catch(() => 0)

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
    const publishedEvidence = body.evidence_list.find((e: any) => e.evidence_id === `${WORK_ID}-ev-3`)
    expect(publishedEvidence).toBeTruthy()
    expect(publishedEvidence.title).toBe('借贷合意证据')
    expect(publishedEvidence.evidence_type).toBe('document')
    expect(publishedEvidence.status).toBe('active')
    expect(publishedEvidence.relevance).toBe('证明双方达成民间借贷合意')
    expect(publishedEvidence.description).toBe(publishDescription)
    expect(publishedEvidence.material_id).toBe(mid)
    expect(typeof publishedEvidence.source).toBe('string')
    expect(publishedEvidence.updated_at === null || typeof publishedEvidence.updated_at === 'string').toBe(true)
    expect(publishedEvidence).not.toHaveProperty('proof_purpose')
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
    expect(se.ai_summary.status).toBe('rule_based')
    expect(typeof se.ai_summary.score).toBe('number')
    expect(typeof se.ai_summary.completeness).toBe('string')
    expect(Array.isArray(se.ai_summary.strengths)).toBe(true)
    expect(Array.isArray(se.ai_summary.risks)).toBe(true)
    expect(Array.isArray(se.ai_summary.recommendations)).toBe(true)
    expect(body.ai_analysis).toBeTruthy()
    expect(typeof body.ai_analysis.status).toBe('string')
    expect(typeof body.ai_analysis.message).toBe('string')
    expect(Array.isArray(body.missing_evidence)).toBe(true)
    // missing_evidence items structure
    for (const me of body.missing_evidence) {
      expect(typeof me.id).toBe('string')
      expect(typeof me.title).toBe('string')
      expect(typeof me.description).toBe('string')
      expect(typeof me.priority).toBe('string')
      expect(typeof me.reason).toBe('string')
      expect(typeof me.suggested_action).toBe('string')
    }

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

    // evidence_next_steps checks
    expect(Array.isArray(body.evidence_next_steps)).toBe(true)
    expect(body.evidence_next_steps.length).toBeLessThanOrEqual(3)
    for (const s of body.evidence_next_steps) {
      expect(typeof s.id).toBe('string')
      expect(typeof s.title).toBe('string')
      expect(typeof s.description).toBe('string')
      expect(typeof s.priority).toBe('string')
      expect(typeof s.reason).toBe('string')
      expect(typeof s.suggested_action).toBe('string')
      expect(typeof s.status).toBe('string')
    }

    // counts after - ensure no new objects were created by endpoint
    const afterEvidence = await prisma.evidence.count({ where: { matter_id: WORK_ID } })
    const afterDocuments = await prisma.document.count({ where: { matter_id: WORK_ID } })
    const afterTimeline = await prisma.timeline.count({ where: { matter_id: WORK_ID } }).catch(() => 0)

    expect(afterEvidence - beforeEvidence).toBe(0)
    expect(afterDocuments - beforeDocuments).toBe(0)
    expect(afterTimeline - beforeTimeline).toBe(0)

    // additional missing_evidence checks for empty-matter scenario
    // create a new empty matter
    const WORK_ID2 = `${TEST_ID}-empty`
    const post2 = await fetch(`${BASE}/matters`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: WORK_ID2, title: 'Empty Evidence WS' }) })
    expect(post2.status).toBe(201)
    const res2 = await fetch(`${BASE}/matters/${WORK_ID2}/evidence/workspace`)
    expect(res2.status).toBe(200)
    const body2 = await res2.json()
    expect(Array.isArray(body2.missing_evidence)).toBe(true)
    // should include missing-basic-evidence when no evidence
    expect(body2.missing_evidence.find((x:any) => x.id === 'missing-basic-evidence')).toBeTruthy()
    // cleanup empty matter
    await fetch(`${BASE}/matters/${WORK_ID2}`, { method: 'DELETE' })

    // cleanup
    await fetch(`${BASE}/matters/${WORK_ID}`, { method: 'DELETE' })
  })
})
