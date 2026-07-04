import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { buildApp } from '../src/server'
import { createPrismaClient } from '@lawdesk/database'

let app: any
let prisma: any
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`
let testMatterId: string

beforeAll(async () => {
  app = await buildApp()
  await app.listen({ port: 0 })
  prisma = createPrismaClient()

  // cleanup
  await prisma.aiRecord.deleteMany({ where: { ai_record_id: { startsWith: `test-prompt-conv-${RUN_ID}` } } })
  await prisma.task.deleteMany({ where: { task_id: { startsWith: `test-prompt-task-${RUN_ID}` } } })
  await prisma.document.deleteMany({ where: { document_id: { startsWith: `test-prompt-doc-${RUN_ID}` } } })
  await prisma.knowledge.deleteMany({ where: { knowledge_id: { startsWith: `test-prompt-res-${RUN_ID}` } } })
  await prisma.evidence.deleteMany({ where: { evidence_id: { startsWith: `test-prompt-evi-${RUN_ID}` } } })
  await prisma.material.deleteMany({ where: { material_id: { startsWith: `test-prompt-mat-${RUN_ID}` } } })
  await prisma.timeline.deleteMany({ where: { timeline_id: { startsWith: `test-prompt-tl-${RUN_ID}` } } })

  testMatterId = `test-matter-prompt-${RUN_ID}`
  await prisma.matter.create({ data: { matter_id: testMatterId, title: 'Prompt Test Matter', description: 'ctx', matter_type: 'test', status: 'active' } })

  // create minimal records
  await app.inject({ method: 'POST', url: `/matters/${testMatterId}/timeline`, payload: { timeline_id: `test-prompt-tl-${RUN_ID}`, event_type: 'note', event_time: new Date().toISOString(), description: 'timeline note' } })
  await app.inject({ method: 'POST', url: `/matters/${testMatterId}/materials`, payload: { material_id: `test-prompt-mat-${RUN_ID}`, title: 'Material 1' } })
  await app.inject({ method: 'POST', url: `/matters/${testMatterId}/evidence`, payload: { evidence_id: `test-prompt-evi-${RUN_ID}`, material_id: `test-prompt-mat-${RUN_ID}`, title: 'Evidence 1' } })
  await app.inject({ method: 'POST', url: `/matters/${testMatterId}/research`, payload: { research_id: `test-prompt-res-${RUN_ID}`, title: 'Research 1' } })
  await app.inject({ method: 'POST', url: `/matters/${testMatterId}/documents`, payload: { document_id: `test-prompt-doc-${RUN_ID}`, title: 'Doc 1' } })
  await app.inject({ method: 'POST', url: `/matters/${testMatterId}/tasks`, payload: { task_id: `test-prompt-task-${RUN_ID}`, title: 'Task 1' } })
  await app.inject({ method: 'POST', url: `/matters/${testMatterId}/conversation`, payload: { message_id: `test-prompt-conv-${RUN_ID}`, role: 'user', content: 'hello' } })
})

afterAll(async () => {
  await prisma.aiRecord.deleteMany({ where: { ai_record_id: { startsWith: `test-prompt-conv-${RUN_ID}` } } })
  await prisma.task.deleteMany({ where: { task_id: { startsWith: `test-prompt-task-${RUN_ID}` } } })
  await prisma.document.deleteMany({ where: { document_id: { startsWith: `test-prompt-doc-${RUN_ID}` } } })
  await prisma.knowledge.deleteMany({ where: { knowledge_id: { startsWith: `test-prompt-res-${RUN_ID}` } } })
  await prisma.evidence.deleteMany({ where: { evidence_id: { startsWith: `test-prompt-evi-${RUN_ID}` } } })
  await prisma.material.deleteMany({ where: { material_id: { startsWith: `test-prompt-mat-${RUN_ID}` } } })
  await prisma.timeline.deleteMany({ where: { timeline_id: { startsWith: `test-prompt-tl-${RUN_ID}` } } })
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('Prompt Builder API', () => {
  it('builds prompt pack without calling any LLM', async () => {
    const res = await app.inject({ method: 'GET', url: `/matters/${testMatterId}/prompt` })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body).toHaveProperty('system_prompt')
    expect(body).toHaveProperty('user_prompt')
    expect(body).toHaveProperty('context_pack')

    const pack = body.context_pack
    expect(pack).toHaveProperty('matter')
    expect(pack).toHaveProperty('timeline')
    expect(pack).toHaveProperty('materials')
    expect(pack).toHaveProperty('evidence')
    expect(pack).toHaveProperty('research')
    expect(pack).toHaveProperty('documents')
    expect(pack).toHaveProperty('tasks')
    expect(pack).toHaveProperty('conversation')
  })
})
