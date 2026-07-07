import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { buildApp } from '../../src/server'
import { createPrismaClient } from '@lawdesk/database'

let app: any
let prisma: any
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`
let testMatterId: string

beforeAll(async () => {
  app = await buildApp()
  await app.listen({ port: 0 })
  prisma = createPrismaClient()
  testMatterId = `test-matter-${RUN_ID}`
  await prisma.matter.create({ data: { matter_id: testMatterId, title: 'Test Matter', description: '', matter_type: 'test', status: 'active' } })
})

afterAll(async () => {
  // cleanup
  await prisma.evidence.deleteMany({ where: { matter_id: testMatterId } })
  await prisma.material.deleteMany({ where: { matter_id: testMatterId } })
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('M42.2: evidence -> legal research decision', () => {
  it('when evidence exists, decision becomes REVIEW_EVIDENCE and plan updated', async () => {
    const matterId = testMatterId
    const res = await app.inject({ method: 'POST', url: `/matters/${matterId}/evidence`, payload: { title: `ev-${RUN_ID}`, type: 'photo' } })
    expect([200,201]).toContain(res.statusCode)
    const body = JSON.parse(res.body)
    expect(body.matter_id).toBe(matterId)

    const rtRes = await app.inject({ method: 'GET', url: `/matters/${matterId}/runtime` })
    expect(rtRes.statusCode).toBe(200)
    const runtime = JSON.parse(rtRes.body)

    // runtime decision should be REVIEW_EVIDENCE
    const decision = runtime.runtime_decision || runtime.runtimeDecision || null
    expect(decision).toBeTruthy()
    expect(decision.code).toBe('REVIEW_EVIDENCE')

    // plan should reflect review evidence
    const plan = runtime.runtime_plan || runtime.runtimePlan || null
    expect(plan).toBeTruthy()
    expect(plan.goal).toBe('Review Evidence')

    // workflow blocking should not contain 'No evidence uploaded'
    expect(runtime.workflow).toBeDefined()
    const blocking = runtime.workflow.blocking || []
    expect(blocking.includes('No evidence uploaded')).toBe(false)

    // find evidence-related queue item by inspecting today_queue fields
    const queue = runtime.today_queue || []
    const evidenceItem = (Array.isArray(queue) ? queue.find((q:any) => {
      const fields = [q.queue_id, q.action_id, q.work_id, q.type, q.title]
      const joined = fields.filter(Boolean).map((f:any) => String(f).toLowerCase()).join(' ')
      return joined.includes('evidence')
    }) : null)
    expect(evidenceItem).toBeTruthy()
    const qid = evidenceItem?.queue_id || evidenceItem?.id || null
    expect(qid).toBeTruthy()

    // start the execution item first (so it becomes RUNNING), then complete it to reach DONE
    const startRes = await app.inject({ method: 'PATCH', url: `/matters/${matterId}/execution/${qid}`, payload: { operation: 'start', action_id: evidenceItem.action_id ?? qid } })
    expect([200,201]).toContain(startRes.statusCode)
    const startBody = JSON.parse(startRes.body || '{}')
    expect(startBody.execution_status).toBeTruthy()
    // now complete
    const patchRes = await app.inject({ method: 'PATCH', url: `/matters/${matterId}/execution/${qid}`, payload: { operation: 'complete', action_id: evidenceItem.action_id ?? qid } })
    expect([200,201]).toContain(patchRes.statusCode)
    const patchBody = JSON.parse(patchRes.body || '{}')
    // ensure persisted status reached DONE (case-insensitive)
    const execStatus = String(patchBody.execution_status || patchBody.status || '').toUpperCase()
    expect(execStatus).toBe('DONE')

    // fetch runtime again and expect decision promoted to LEGAL_RESEARCH
    const rtRes2 = await app.inject({ method: 'GET', url: `/matters/${matterId}/runtime` })
    expect(rtRes2.statusCode).toBe(200)
    const runtime2 = JSON.parse(rtRes2.body)
    const decision2 = runtime2.runtime_decision || runtime2.runtimeDecision || null
    // keep only necessary assertions; detailed debug printed by test harness on failure
    expect(decision2).toBeTruthy()
    expect(decision2.code).toBe('LEGAL_RESEARCH')

    const plan2 = runtime2.runtime_plan || runtime2.runtimePlan || null
    expect(plan2).toBeTruthy()
    expect(plan2.goal).toBe('Legal Research')

    // verify today_queue and works reflect three research actions
    const tq2 = runtime2.today_queue || runtime2.todayQueue || []
    expect(Array.isArray(tq2)).toBe(true)
    // expect three research queue items (search statutes, search precedents, generate memo)
    const researchItems = (tq2 || []).filter((q:any) => String(q.work_id || '').startsWith('work-research-'))
    expect(researchItems.length).toBeGreaterThanOrEqual(3)
  })
})
