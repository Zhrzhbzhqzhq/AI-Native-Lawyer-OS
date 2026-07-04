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

  await prisma.aiRecord.deleteMany({ where: { ai_record_id: { startsWith: `test-conv-pr-${RUN_ID}` } } })
  await prisma.task.deleteMany({ where: { task_id: { startsWith: `test-task-pr-${RUN_ID}` } } })
  await prisma.document.deleteMany({ where: { document_id: { startsWith: `test-doc-pr-${RUN_ID}` } } })
  await prisma.knowledge.deleteMany({ where: { knowledge_id: { startsWith: `test-res-pr-${RUN_ID}` } } })
  await prisma.evidence.deleteMany({ where: { evidence_id: { startsWith: `test-evi-pr-${RUN_ID}` } } })
  await prisma.material.deleteMany({ where: { material_id: { startsWith: `test-mat-pr-${RUN_ID}` } } })
  await prisma.timeline.deleteMany({ where: { timeline_id: { startsWith: `test-tl-pr-${RUN_ID}` } } })

  testMatterId = `test-matter-pr-${RUN_ID}`
  await prisma.matter.create({
    data: {
      matter_id: testMatterId,
      title: 'Prompt Runtime Test Matter',
      description: 'prompt runtime',
      matter_type: 'test',
      status: 'active',
    },
  })
})

afterAll(async () => {
  await prisma.aiRecord.deleteMany({ where: { ai_record_id: { startsWith: `test-conv-pr-${RUN_ID}` } } })
  await prisma.task.deleteMany({ where: { task_id: { startsWith: `test-task-pr-${RUN_ID}` } } })
  await prisma.document.deleteMany({ where: { document_id: { startsWith: `test-doc-pr-${RUN_ID}` } } })
  await prisma.knowledge.deleteMany({ where: { knowledge_id: { startsWith: `test-res-pr-${RUN_ID}` } } })
  await prisma.evidence.deleteMany({ where: { evidence_id: { startsWith: `test-evi-pr-${RUN_ID}` } } })
  await prisma.material.deleteMany({ where: { material_id: { startsWith: `test-mat-pr-${RUN_ID}` } } })
  await prisma.timeline.deleteMany({ where: { timeline_id: { startsWith: `test-tl-pr-${RUN_ID}` } } })
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('Prompt Runtime API', () => {
  it('returns prompt pack with context_runtime and prompts', async () => {
    const mId = testMatterId

    // create some data to ensure graph has content
    const materialId = `test-mat-pr-${RUN_ID}-${Date.now()}`
    await app.inject({ method: 'POST', url: `/matters/${mId}/materials`, payload: { material_id: materialId, title: 'Material 1' } })

    const taskOpenId = `test-task-pr-${RUN_ID}-open`
    await app.inject({ method: 'POST', url: `/matters/${mId}/tasks`, payload: { task_id: taskOpenId, title: 'Task Open', status: 'open' } })

    const res = await app.inject({ method: 'GET', url: `/matters/${mId}/prompt-runtime` })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)

    expect(body).toHaveProperty('matter_id')
    expect(body.matter_id).toBe(mId)
    expect(body).toHaveProperty('system_prompt')
    expect(typeof body.system_prompt).toBe('string')
    expect(body).toHaveProperty('user_prompt')
    expect(typeof body.user_prompt).toBe('string')
    expect(body).toHaveProperty('context_runtime')
    expect(body.context_runtime).toHaveProperty('graph')
    expect(body.context_runtime).toHaveProperty('activeTasks')

    // Ensure no LLM called: aiRecord should be empty for this matter
    const records = await prisma.aiRecord.findMany({ where: { matter_id: mId } })
    expect(records.length).toBe(0)
  })
})
