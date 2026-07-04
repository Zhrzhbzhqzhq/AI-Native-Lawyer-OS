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

  await prisma.aiRecord.deleteMany({ where: { ai_record_id: { startsWith: `test-conv-prt-${RUN_ID}` } } })
  await prisma.task.deleteMany({ where: { task_id: { startsWith: `test-task-prt-${RUN_ID}` } } })
  await prisma.document.deleteMany({ where: { document_id: { startsWith: `test-doc-prt-${RUN_ID}` } } })
  await prisma.knowledge.deleteMany({ where: { knowledge_id: { startsWith: `test-res-prt-${RUN_ID}` } } })
  await prisma.evidence.deleteMany({ where: { evidence_id: { startsWith: `test-evi-prt-${RUN_ID}` } } })
  await prisma.material.deleteMany({ where: { material_id: { startsWith: `test-mat-prt-${RUN_ID}` } } })
  await prisma.timeline.deleteMany({ where: { timeline_id: { startsWith: `test-tl-prt-${RUN_ID}` } } })

  testMatterId = `test-matter-prt-${RUN_ID}`
  await prisma.matter.create({
    data: {
      matter_id: testMatterId,
      title: 'Planner Runtime Test Matter',
      description: 'planner runtime',
      matter_type: 'test',
      status: 'active',
    },
  })
})

afterAll(async () => {
  await prisma.aiRecord.deleteMany({ where: { ai_record_id: { startsWith: `test-conv-prt-${RUN_ID}` } } })
  await prisma.task.deleteMany({ where: { task_id: { startsWith: `test-task-prt-${RUN_ID}` } } })
  await prisma.document.deleteMany({ where: { document_id: { startsWith: `test-doc-prt-${RUN_ID}` } } })
  await prisma.knowledge.deleteMany({ where: { knowledge_id: { startsWith: `test-res-prt-${RUN_ID}` } } })
  await prisma.evidence.deleteMany({ where: { evidence_id: { startsWith: `test-evi-prt-${RUN_ID}` } } })
  await prisma.material.deleteMany({ where: { material_id: { startsWith: `test-mat-prt-${RUN_ID}` } } })
  await prisma.timeline.deleteMany({ where: { timeline_id: { startsWith: `test-tl-prt-${RUN_ID}` } } })
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('Planner Runtime API', () => {
  it('returns runtime plan using mock provider and does not create tasks or update workflow', async () => {
    const mId = testMatterId

    // create some data
    const materialId = `test-mat-prt-${RUN_ID}-${Date.now()}`
    await app.inject({ method: 'POST', url: `/matters/${mId}/materials`, payload: { material_id: materialId, title: 'Material 1' } })

    const res = await app.inject({ method: 'POST', url: `/matters/${mId}/plan-runtime` })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)

    expect(body).toHaveProperty('matter_id')
    expect(body.matter_id).toBe(mId)
    expect(body.provider).toBe('mock')
    expect(body.model).toBe('mock-lawdesk-v1')
    expect(Array.isArray(body.recommended_actions)).toBe(true)
    expect(Array.isArray(body.missing_items)).toBe(true)
    expect(Array.isArray(body.risks)).toBe(true)
    expect(body).toHaveProperty('prompt_runtime')
    expect(body.prompt_runtime).toHaveProperty('context_runtime')
    expect(body.prompt_runtime.context_runtime).toHaveProperty('graph')

    // ensure no task created by this call (we only created material before)
    const tasks = await prisma.task.findMany({ where: { matter_id: mId } })
    expect(tasks.length).toBe(0)

    // workflow instance should remain untouched (no new instance created)
    const wfRes = await app.inject({ method: 'GET', url: `/matters/${mId}/workflow` })
    // not started => 404
    expect(wfRes.statusCode).toBe(404)
  })
})
