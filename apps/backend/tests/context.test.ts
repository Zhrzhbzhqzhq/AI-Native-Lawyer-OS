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

  // cleanup any previous test artifacts
  // delete dependents first to avoid FK constraint failures
  await prisma.aiRecord.deleteMany({ where: { ai_record_id: { startsWith: `test-conv-${RUN_ID}` } } })
  await prisma.task.deleteMany({ where: { task_id: { startsWith: `test-task-${RUN_ID}` } } })
  await prisma.document.deleteMany({ where: { matter_id: testMatterId } }).catch(() => { })
  await prisma.knowledge.deleteMany({ where: { knowledge_id: { startsWith: `test-res-${RUN_ID}` } } })
  await prisma.evidence.deleteMany({ where: { evidence_id: { startsWith: `test-evi-${RUN_ID}` } } })
  await prisma.material.deleteMany({ where: { material_id: { startsWith: `test-mat-${RUN_ID}` } } })
  await prisma.timeline.deleteMany({ where: { timeline_id: { startsWith: `test-tl-${RUN_ID}` } } })

  testMatterId = `test-matter-${RUN_ID}`
  await prisma.matter.create({ data: { matter_id: testMatterId, title: 'Context Test Matter', description: 'ctx', matter_type: 'test', status: 'active' } })
})

afterAll(async () => {
  // delete dependents first to avoid FK constraint failures
  await prisma.aiRecord.deleteMany({ where: { ai_record_id: { startsWith: `test-conv-${RUN_ID}` } } })
  await prisma.task.deleteMany({ where: { task_id: { startsWith: `test-task-${RUN_ID}` } } })
  await prisma.document.deleteMany({ where: { matter_id: testMatterId } }).catch(() => { })
  await prisma.knowledge.deleteMany({ where: { knowledge_id: { startsWith: `test-res-${RUN_ID}` } } })
  await prisma.evidence.deleteMany({ where: { evidence_id: { startsWith: `test-evi-${RUN_ID}` } } })
  await prisma.material.deleteMany({ where: { material_id: { startsWith: `test-mat-${RUN_ID}` } } })
  await prisma.timeline.deleteMany({ where: { timeline_id: { startsWith: `test-tl-${RUN_ID}` } } })
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('Matter Context API', () => {
  it('aggregates all matter data into a context object', async () => {
    const mId = testMatterId

    // timeline
    const timelineId = `test-tl-${RUN_ID}-${Date.now()}`
    await app.inject({ method: 'POST', url: `/matters/${mId}/timeline`, payload: { timeline_id: timelineId, event_type: 'note', event_time: new Date().toISOString(), description: 'timeline note' } })

    // material
    const materialId = `test-mat-${RUN_ID}-${Date.now()}`
    await app.inject({ method: 'POST', url: `/matters/${mId}/materials`, payload: { material_id: materialId, title: 'Material 1' } })

    // evidence linked to material
    const evidenceId = `test-evi-${RUN_ID}-${Date.now()}`
    await app.inject({ method: 'POST', url: `/matters/${mId}/evidence`, payload: { evidence_id: evidenceId, material_id: materialId, title: 'Evidence 1' } })

    // research
    const researchId = `test-res-${RUN_ID}-${Date.now()}`
    await app.inject({ method: 'POST', url: `/matters/${mId}/research`, payload: { research_id: researchId, title: 'Research 1' } })

    // document (capture created id from response)
    const docIdPayload = `test-doc-${RUN_ID}-${Date.now()}`
    const docRes = await app.inject({ method: 'POST', url: `/matters/${mId}/documents`, payload: { document_id: docIdPayload, title: 'Doc 1' } })
    const docCreated = JSON.parse(docRes.body).created
    const docId = docCreated?.document_id || docIdPayload

    // task
    const taskId = `test-task-${RUN_ID}-${Date.now()}`
    await app.inject({ method: 'POST', url: `/matters/${mId}/tasks`, payload: { task_id: taskId, title: 'Task 1' } })

    // conversation message
    const convId = `test-conv-${RUN_ID}-${Date.now()}`
    await app.inject({ method: 'POST', url: `/matters/${mId}/conversation`, payload: { message_id: convId, role: 'user', content: 'hello' } })

    // call context
    const res = await app.inject({ method: 'GET', url: `/matters/${mId}/context` })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)

    expect(body).toHaveProperty('matter')
    expect(body).toHaveProperty('timeline')
    expect(body).toHaveProperty('materials')
    expect(body).toHaveProperty('evidence')
    expect(body).toHaveProperty('research')
    expect(body).toHaveProperty('documents')
    expect(body).toHaveProperty('tasks')
    expect(body).toHaveProperty('conversation')
    expect(body).toHaveProperty('generated_at')

    // verify each contains our entries
    const tl = body.timeline.find((t: any) => t.timeline_id === timelineId)
    expect(tl).toBeTruthy()

    const mat = body.materials.find((m: any) => m.material_id === materialId)
    expect(mat).toBeTruthy()

    const evi = body.evidence.find((e: any) => e.evidence_id === evidenceId)
    expect(evi).toBeTruthy()

    const resr = body.research.find((r: any) => r.knowledge_id === researchId)
    expect(resr).toBeTruthy()

    const doc = body.documents.find((d: any) => d.document_id === docId)
    expect(doc).toBeTruthy()

    const tsk = body.tasks.find((t: any) => t.task_id === taskId)
    expect(tsk).toBeTruthy()

    const conv = body.conversation.find((c: any) => c.ai_record_id === convId)
    expect(conv).toBeTruthy()
  })
})
