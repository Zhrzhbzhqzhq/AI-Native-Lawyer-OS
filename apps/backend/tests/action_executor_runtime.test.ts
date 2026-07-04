import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { buildApp } from '../src/server'
import { createPrismaClient } from '@lawdesk/database'

let app: any
let prisma: any
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
let testMatterId: string

beforeAll(async () => {
  app = await buildApp()
  await app.listen({ port: 0 })
  prisma = createPrismaClient()

  testMatterId = `test-matter-aert-${RUN_ID}`
  await prisma.matter.create({ data: { matter_id: testMatterId, title: 'AE Runtime Test', description: 'ae runtime', matter_type: 'test', status: 'active' } })
})

afterAll(async () => {
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('Action Executor Runtime', () => {
  it('rejects non-approved proposals and executes approved ones', async () => {
    const mId = testMatterId

    // ensure planner has recommended actions
    await app.inject({ method: 'POST', url: `/matters/${mId}/plan-runtime` })

    // generate proposals
    const postRes = await app.inject({ method: 'POST', url: `/matters/${mId}/action-proposals` })
    expect(postRes.statusCode).toBe(201)
    const created = JSON.parse(postRes.body)
    expect(Array.isArray(created)).toBe(true)

    if (created.length === 0) return

    const pid = created[0].proposal_id

    // pending should return 400
    const execPending = await app.inject({ method: 'POST', url: `/matters/${mId}/action-proposals/${pid}/execute` })
    expect(execPending.statusCode).toBe(400)

    // set to rejected -> still 400
    const patchRes = await app.inject({ method: 'PATCH', url: `/matters/${mId}/action-proposals/${pid}`, payload: { status: 'rejected' } })
    expect(patchRes.statusCode).toBe(200)
    const execRejected = await app.inject({ method: 'POST', url: `/matters/${mId}/action-proposals/${pid}/execute` })
    expect(execRejected.statusCode).toBe(400)

    // set to approved
    const patchRes2 = await app.inject({ method: 'PATCH', url: `/matters/${mId}/action-proposals/${pid}`, payload: { status: 'approved' } })
    expect(patchRes2.statusCode).toBe(200)

    // execute approved
    const execApproved = await app.inject({ method: 'POST', url: `/matters/${mId}/action-proposals/${pid}/execute` })
    // should either 200 or 201 depending on implementation
    expect([200,201]).toContain(execApproved.statusCode)
    const executed = JSON.parse(execApproved.body)
    expect(executed.proposal_id).toBe(pid)
    expect(executed.status).toBe('executed')

    // verify proposal exists and got executed
    const list = await app.inject({ method: 'GET', url: `/matters/${mId}/action-proposals` })
    const all = JSON.parse(list.body)
    const approved = all.find((p: any) => p.proposal_id === pid)
    expect(approved).toBeTruthy()

    // idempotency: second execution should not create resources again and should be safe
    const execAgain = await app.inject({ method: 'POST', url: `/matters/${mId}/action-proposals/${pid}/execute` })
    expect([200,201]).toContain(execAgain.statusCode)
    const executedAgain = JSON.parse(execAgain.body)
    expect(executedAgain.status).toBe('executed')
    expect(executedAgain.result).toBe('already_executed')
  })

  it('executes exactly one resource type per action', async () => {
    const mId = testMatterId

    // Generate proposals from planner
    const generated = await app.inject({ method: 'POST', url: `/matters/${mId}/action-proposals` })
    expect(generated.statusCode).toBe(201)

    const listRes = await app.inject({ method: 'GET', url: `/matters/${mId}/action-proposals` })
    expect(listRes.statusCode).toBe(200)
    const proposals = JSON.parse(listRes.body)
    expect(Array.isArray(proposals)).toBe(true)

    const wanted = ['create_task', 'create_document', 'create_research']
    for (const action of wanted) {
      const p = proposals.find((x: any) => x.action === action && x.status !== 'executed')
      if (!p) continue

      const approveRes = await app.inject({
        method: 'PATCH',
        url: `/matters/${mId}/action-proposals/${p.proposal_id}`,
        payload: { status: 'approved' },
      })
      expect(approveRes.statusCode).toBe(200)

      const execRes = await app.inject({
        method: 'POST',
        url: `/matters/${mId}/action-proposals/${p.proposal_id}/execute`,
      })
      expect([200, 201]).toContain(execRes.statusCode)
      const body = JSON.parse(execRes.body)
      expect(body.status).toBe('executed')

      if (action === 'create_task') {
        expect(body.result?.task).toBeTruthy()
        expect(body.result?.document ?? null).toBeNull()
        expect(body.result?.research ?? null).toBeNull()
      }

      if (action === 'create_document') {
        expect(body.result?.document).toBeTruthy()
        expect(body.result?.task ?? null).toBeNull()
        expect(body.result?.research ?? null).toBeNull()
      }

      if (action === 'create_research') {
        expect(body.result?.research).toBeTruthy()
        expect(body.result?.knowledge ?? null).toBeNull()
        expect(body.result?.task ?? null).toBeNull()
        expect(body.result?.document ?? null).toBeNull()
      }
    }
  })
})
