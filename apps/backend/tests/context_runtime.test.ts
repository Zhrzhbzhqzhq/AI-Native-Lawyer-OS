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

  await prisma.aiRecord.deleteMany({ where: { ai_record_id: { startsWith: `test-conv-ctxrt-${RUN_ID}` } } })
  await prisma.task.deleteMany({ where: { task_id: { startsWith: `test-task-ctxrt-${RUN_ID}` } } })
  await prisma.document.deleteMany({ where: { document_id: { startsWith: `test-doc-ctxrt-${RUN_ID}` } } })
  await prisma.knowledge.deleteMany({ where: { knowledge_id: { startsWith: `test-res-ctxrt-${RUN_ID}` } } })
  await prisma.evidence.deleteMany({ where: { evidence_id: { startsWith: `test-evi-ctxrt-${RUN_ID}` } } })
  await prisma.material.deleteMany({ where: { material_id: { startsWith: `test-mat-ctxrt-${RUN_ID}` } } })
  await prisma.timeline.deleteMany({ where: { timeline_id: { startsWith: `test-tl-ctxrt-${RUN_ID}` } } })

  testMatterId = `test-matter-ctxrt-${RUN_ID}`
  await prisma.matter.create({
    data: {
      matter_id: testMatterId,
      title: 'Context Runtime Test Matter',
      description: 'context runtime',
      matter_type: 'test',
      status: 'active',
    },
  })
})

afterAll(async () => {
  await prisma.aiRecord.deleteMany({ where: { ai_record_id: { startsWith: `test-conv-ctxrt-${RUN_ID}` } } })
  await prisma.task.deleteMany({ where: { task_id: { startsWith: `test-task-ctxrt-${RUN_ID}` } } })
  await prisma.document.deleteMany({ where: { document_id: { startsWith: `test-doc-ctxrt-${RUN_ID}` } } })
  await prisma.knowledge.deleteMany({ where: { knowledge_id: { startsWith: `test-res-ctxrt-${RUN_ID}` } } })
  await prisma.evidence.deleteMany({ where: { evidence_id: { startsWith: `test-evi-ctxrt-${RUN_ID}` } } })
  await prisma.material.deleteMany({ where: { material_id: { startsWith: `test-mat-ctxrt-${RUN_ID}` } } })
  await prisma.timeline.deleteMany({ where: { timeline_id: { startsWith: `test-tl-ctxrt-${RUN_ID}` } } })
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('Context Builder Runtime API', () => {
  it('builds runtime context and classifies objects correctly', async () => {
    const mId = testMatterId

    const tlOldId = `test-tl-ctxrt-${RUN_ID}-old`
    const tlNewId = `test-tl-ctxrt-${RUN_ID}-new`
    const oldTime = new Date('2025-01-01T00:00:00.000Z').toISOString()
    const newTime = new Date('2025-01-02T00:00:00.000Z').toISOString()
    await app.inject({ method: 'POST', url: `/matters/${mId}/timeline`, payload: { timeline_id: tlOldId, event_type: 'note', event_time: oldTime, description: 'old' } })
    await app.inject({ method: 'POST', url: `/matters/${mId}/timeline`, payload: { timeline_id: tlNewId, event_type: 'note', event_time: newTime, description: 'new' } })

    const materialId = `test-mat-ctxrt-${RUN_ID}-${Date.now()}`
    await app.inject({ method: 'POST', url: `/matters/${mId}/materials`, payload: { material_id: materialId, title: 'Material 1' } })

    const evidenceActiveId = `test-evi-ctxrt-${RUN_ID}-active`
    const evidenceDiscardedId = `test-evi-ctxrt-${RUN_ID}-discarded`
    await app.inject({ method: 'POST', url: `/matters/${mId}/evidence`, payload: { evidence_id: evidenceActiveId, material_id: materialId, title: 'Evidence Active', status: 'active' } })
    await app.inject({ method: 'POST', url: `/matters/${mId}/evidence`, payload: { evidence_id: evidenceDiscardedId, material_id: materialId, title: 'Evidence Discarded', status: 'discarded' } })

    const taskOpenId = `test-task-ctxrt-${RUN_ID}-open`
    const taskDoneId = `test-task-ctxrt-${RUN_ID}-done`
    await app.inject({ method: 'POST', url: `/matters/${mId}/tasks`, payload: { task_id: taskOpenId, title: 'Task Open', status: 'open' } })
    await app.inject({ method: 'POST', url: `/matters/${mId}/tasks`, payload: { task_id: taskDoneId, title: 'Task Done', status: 'done' } })

    const docDraftId = `test-doc-ctxrt-${RUN_ID}-draft`
    const docFinalId = `test-doc-ctxrt-${RUN_ID}-final`
    await app.inject({ method: 'POST', url: `/matters/${mId}/documents`, payload: { document_id: docDraftId, title: 'Doc Draft', status: 'draft' } })
    await app.inject({ method: 'POST', url: `/matters/${mId}/documents`, payload: { document_id: docFinalId, title: 'Doc Final', status: 'final' } })

    const convOldId = `test-conv-ctxrt-${RUN_ID}-old`
    const convNewId = `test-conv-ctxrt-${RUN_ID}-new`
    await app.inject({ method: 'POST', url: `/matters/${mId}/conversation`, payload: { message_id: convOldId, role: 'user', content: 'old message' } })
    await app.inject({ method: 'POST', url: `/matters/${mId}/conversation`, payload: { message_id: convNewId, role: 'assistant', content: 'new message' } })

    const res = await app.inject({ method: 'GET', url: `/matters/${mId}/context-runtime` })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)

    expect(body).toHaveProperty('graph')
    expect(body).toHaveProperty('summary')
    expect(body).toHaveProperty('activeTasks')
    expect(body).toHaveProperty('keyEvidence')
    expect(body).toHaveProperty('latestConversation')
    expect(body).toHaveProperty('recentTimeline')
    expect(body).toHaveProperty('pendingDocuments')

    // context-runtime returns matter via graph
    expect(body.graph.matter.matter_id).toBe(mId)

    // Graph build success
    expect(Array.isArray(body.graph.timeline)).toBe(true)
    expect(Array.isArray(body.graph.tasks)).toBe(true)
    expect(Array.isArray(body.graph.evidence)).toBe(true)

    // activeTasks: status not in completed/done/closed
    expect(body.activeTasks.length).toBe(1)
    expect(body.activeTasks[0].task_id).toBe(taskOpenId)

    // keyEvidence: include all evidence for now
    expect(body.keyEvidence.length).toBe(2)
    expect(body.keyEvidence.find((e: any) => e.evidence_id === evidenceActiveId)).toBeTruthy()
    expect(body.keyEvidence.find((e: any) => e.evidence_id === evidenceDiscardedId)).toBeTruthy()

    // Timeline sorting: newest first
    expect(body.recentTimeline.length).toBeGreaterThanOrEqual(2)
    expect(body.recentTimeline[0].timeline_id).toBe(tlNewId)
    expect(body.recentTimeline[1].timeline_id).toBe(tlOldId)

    // pendingDocuments: status not in completed/final/archived
    expect(body.pendingDocuments.length).toBe(1)
    expect(body.pendingDocuments[0].document_id).toBe(docDraftId)

    // Latest conversation sorted by created_at desc
    expect(body.latestConversation.length).toBeGreaterThanOrEqual(2)
    expect(body.latestConversation[0].ai_record_id).toBe(convNewId)
  })
})