import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { buildApp } from '../src/server'
import { createPrismaClient } from '@lawdesk/database'
import TimelineRepository from '../src/repositories/timelineRepository'
import MaterialRepository from '../src/repositories/materialRepository'
import EvidenceRepository from '../src/repositories/evidenceRepository'
import ResearchRepository from '../src/repositories/researchRepository'
import DocumentRepository from '../src/repositories/documentRepository'
import TaskRepository from '../src/repositories/taskRepository'
import ConversationRepository from '../src/repositories/conversationRepository'

let app: any
let prisma: any
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
let testMatterId: string

beforeAll(async () => {
  app = await buildApp()
  await app.listen({ port: 0 })
  prisma = createPrismaClient()
  testMatterId = `test-matter-graph-${RUN_ID}`

  await prisma.aiRecord.deleteMany({ where: { ai_record_id: { startsWith: `test-conv-graph-${RUN_ID}` } } })
  await prisma.task.deleteMany({ where: { task_id: { startsWith: `test-task-graph-${RUN_ID}` } } })
  await prisma.document.deleteMany({ where: { matter_id: testMatterId } }).catch(() => { })
  await prisma.knowledge.deleteMany({ where: { knowledge_id: { startsWith: `test-res-graph-${RUN_ID}` } } })
  await prisma.evidence.deleteMany({ where: { evidence_id: { startsWith: `test-evi-graph-${RUN_ID}` } } })
  await prisma.material.deleteMany({ where: { material_id: { startsWith: `test-mat-graph-${RUN_ID}` } } })
  await prisma.timeline.deleteMany({ where: { timeline_id: { startsWith: `test-tl-graph-${RUN_ID}` } } })

  await prisma.matter.create({
    data: {
      matter_id: testMatterId,
      title: 'Object Graph Test Matter',
      description: 'graph',
      matter_type: 'test',
      status: 'active',
    },
  })
})

afterAll(async () => {
  await prisma.aiRecord.deleteMany({ where: { ai_record_id: { startsWith: `test-conv-graph-${RUN_ID}` } } })
  await prisma.task.deleteMany({ where: { task_id: { startsWith: `test-task-graph-${RUN_ID}` } } })
  await prisma.document.deleteMany({ where: { matter_id: testMatterId } }).catch(() => { })
  await prisma.knowledge.deleteMany({ where: { knowledge_id: { startsWith: `test-res-graph-${RUN_ID}` } } })
  await prisma.evidence.deleteMany({ where: { evidence_id: { startsWith: `test-evi-graph-${RUN_ID}` } } })
  await prisma.material.deleteMany({ where: { material_id: { startsWith: `test-mat-graph-${RUN_ID}` } } })
  await prisma.timeline.deleteMany({ where: { timeline_id: { startsWith: `test-tl-graph-${RUN_ID}` } } })
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('Object Graph Runtime API', () => {
  it('gets graph and aggregates all repositories with matching counts', async () => {
    const mId = testMatterId

    const timelineId = `test-tl-graph-${RUN_ID}-${Date.now()}`
    await app.inject({ method: 'POST', url: `/matters/${mId}/timeline`, payload: { timeline_id: timelineId, event_type: 'note', event_time: new Date().toISOString(), description: 'timeline note' } })

    const materialId = `test-mat-graph-${RUN_ID}-${Date.now()}`
    await app.inject({ method: 'POST', url: `/matters/${mId}/materials`, payload: { material_id: materialId, title: 'Material 1' } })

    const evidenceId = `test-evi-graph-${RUN_ID}-${Date.now()}`
    await app.inject({ method: 'POST', url: `/matters/${mId}/evidence`, payload: { evidence_id: evidenceId, material_id: materialId, title: 'Evidence 1' } })

    const researchId = `test-res-graph-${RUN_ID}-${Date.now()}`
    await app.inject({ method: 'POST', url: `/matters/${mId}/research`, payload: { research_id: researchId, title: 'Research 1' } })

    const documentIdPayload = `test-doc-graph-${RUN_ID}-${Date.now()}`
    const docRes = await app.inject({ method: 'POST', url: `/matters/${mId}/documents`, payload: { document_id: documentIdPayload, title: 'Doc 1' } })
    const createdDoc = JSON.parse(docRes.body).created
    const documentId = createdDoc?.document_id || documentIdPayload

    const taskId = `test-task-graph-${RUN_ID}-${Date.now()}`
    await app.inject({ method: 'POST', url: `/matters/${mId}/tasks`, payload: { task_id: taskId, title: 'Task 1' } })

    const conversationId = `test-conv-graph-${RUN_ID}-${Date.now()}`
    await app.inject({ method: 'POST', url: `/matters/${mId}/conversation`, payload: { message_id: conversationId, role: 'user', content: 'hello graph' } })

    const timelineRepo = new TimelineRepository(prisma)
    const materialRepo = new MaterialRepository(prisma)
    const evidenceRepo = new EvidenceRepository(prisma)
    const researchRepo = new ResearchRepository(prisma)
    const documentRepo = new DocumentRepository(prisma)
    const taskRepo = new TaskRepository(prisma)
    const conversationRepo = new ConversationRepository(prisma)

    const [timelineRows, materialRows, evidenceRows, researchRows, documentRows, taskRows, conversationRows] = await Promise.all([
      timelineRepo.findByMatterId(mId),
      materialRepo.findByMatterId(mId),
      evidenceRepo.findByMatterId(mId),
      researchRepo.findByMatterId(mId),
      documentRepo.findByMatterId(mId),
      taskRepo.findByMatterId(mId),
      conversationRepo.findByMatterId(mId),
    ])

    const res = await app.inject({ method: 'GET', url: `/matters/${mId}/graph` })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)

    expect(body).toHaveProperty('matter')
    expect(body).toHaveProperty('timeline')
    expect(body).toHaveProperty('materials')
    expect(body).toHaveProperty('evidence')
    expect(body).toHaveProperty('research')
    expect(body).toHaveProperty('documents')
    expect(body).toHaveProperty('tasks')
    expect(body).toHaveProperty('conversations')

    expect(body.matter.matter_id).toBe(mId)

    expect(body.timeline.length).toBe(timelineRows.length)
    expect(body.materials.length).toBe(materialRows.length)
    expect(body.evidence.length).toBe(evidenceRows.length)
    expect(body.research.length).toBe(researchRows.length)
    expect(body.documents.length).toBe(documentRows.length)
    expect(body.tasks.length).toBe(taskRows.length)
    expect(body.conversations.length).toBe(conversationRows.length)

    expect(body.timeline.find((t: any) => t.timeline_id === timelineId)).toBeTruthy()
    expect(body.materials.find((m: any) => m.material_id === materialId)).toBeTruthy()
    expect(body.evidence.find((e: any) => e.evidence_id === evidenceId)).toBeTruthy()
    expect(body.research.find((r: any) => r.knowledge_id === researchId)).toBeTruthy()
    expect(body.documents.find((d: any) => d.document_id === documentId)).toBeTruthy()
    expect(body.tasks.find((t: any) => t.task_id === taskId)).toBeTruthy()
    expect(body.conversations.find((c: any) => c.ai_record_id === conversationId)).toBeTruthy()
  })
})
