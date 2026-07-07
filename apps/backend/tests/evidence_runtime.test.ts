import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { buildApp } from '../src/server'
import { createPrismaClient } from '@lawdesk/database'

let app: any
let prisma: any
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`
let testMatterId: string
let createdMaterialId: string | null = null
let createdEvidenceId: string | null = null

beforeAll(async () => {
  app = await buildApp()
  await app.listen({ port: 0 })
  prisma = createPrismaClient()
  // cleanup any previous evidence entries for this run
  await prisma.evidence.deleteMany({ where: { evidence_id: { startsWith: `test-ev-${RUN_ID}` } } })
  // create a test matter to satisfy FK constraints
  testMatterId = `test-matter-${RUN_ID}`
  await prisma.matter.create({ data: { matter_id: testMatterId, title: 'Test Matter', description: '', matter_type: 'test', status: 'active' } })
})

afterAll(async () => {
  // delete evidence first, then materials, then matter to satisfy FK constraints
  if (createdEvidenceId) {
    await prisma.evidence.deleteMany({ where: { evidence_id: createdEvidenceId } })
  } else {
    await prisma.evidence.deleteMany({ where: { evidence_id: { startsWith: `test-ev-${RUN_ID}` } } })
  }

  if (createdMaterialId) {
    await prisma.material.deleteMany({ where: { material_id: createdMaterialId } })
  } else {
    await prisma.material.deleteMany({ where: { matter_id: testMatterId } })
  }

  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('Evidence -> runtime integration', () => {
  it('creates minimal evidence and runtime reflects evidence presence', async () => {
    const matterId = testMatterId

    // create minimal evidence using title only
    const res = await app.inject({ method: 'POST', url: `/matters/${matterId}/evidence`, payload: { title: `test-ev-${RUN_ID}` } })
    expect([200,201]).toContain(res.statusCode)
    const body = JSON.parse(res.body)
    expect(body.title).toBe(`test-ev-${RUN_ID}`)
    expect(body.matter_id).toBe(matterId)
    // record created ids for cleanup
    createdEvidenceId = body.evidence_id || null
    createdMaterialId = body.material_id || null

    // fetch runtime
    const rtRes = await app.inject({ method: 'GET', url: `/matters/${matterId}/runtime` })
    expect(rtRes.statusCode).toBe(200)
    const runtime = JSON.parse(rtRes.body)

    // additional assertions for M42.2: decision and plan updated
    const decision = runtime.runtime_decision || runtime.runtimeDecision || null
    const plan = runtime.runtime_plan || runtime.runtimePlan || null
    // decision should not be COLLECT_EVIDENCE and should be REVIEW_EVIDENCE
    if (decision) {
      expect(decision.code).not.toBe('COLLECT_EVIDENCE')
      expect(decision.code).toBe('REVIEW_EVIDENCE')
    }
    if (plan) {
      if (decision && decision.code === 'REVIEW_EVIDENCE') {
        expect(plan.goal).toBe('Review Evidence')
      }
    }

    // evidence.total should be > 0
    expect(runtime.evidence).toBeDefined()
    expect(typeof runtime.evidence.total).toBe('number')
    expect(runtime.evidence.total).toBeGreaterThan(0)

    // workflow.blocking should not include 'No evidence uploaded'
    expect(runtime.workflow).toBeDefined()
    expect(Array.isArray(runtime.workflow.blocking)).toBe(true)
    const blocking = runtime.workflow.blocking || []
    expect(blocking.includes('No evidence uploaded')).toBe(false)
  })
})
