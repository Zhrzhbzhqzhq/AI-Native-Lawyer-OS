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

  testMatterId = `test-matter-snap-${RUN_ID}`
  await prisma.matter.create({ data: { matter_id: testMatterId, title: 'Snapshot Test', description: 'snapshot runtime', matter_type: 'test', status: 'active' } })

  // create some sample data
  await prisma.task.create({ data: { task_id: `t-${RUN_ID}`, matter_id: testMatterId, title: 'T1', status: 'open', description: 'Snapshot test task', priority: 'normal' } })
  await prisma.document.create({ data: { document_id: `d-${RUN_ID}`, matter_id: testMatterId, title: 'Doc1', status: 'draft', document_type: 'draft', version: 'v1', content_uri: '' } })
  // create material fixture required by Evidence.material_id FK
  await prisma.material.create({ data: { material_id: `m-${RUN_ID}`, matter_id: testMatterId, title: 'Material1', material_type: 'document', source: 'test', storage_uri: '/tmp/material1', status: 'uploaded' } })
  await prisma.evidence.create({ data: { evidence_id: `e-${RUN_ID}`, matter_id: testMatterId, material_id: `m-${RUN_ID}`, title: 'E1', evidence_type: 'unknown', description: '', relevance: 'unknown', status: 'active' } })
  // create knowledge entry instead of research (schema uses Knowledge)
  try {
    await prisma.knowledge.create({ data: { knowledge_id: `k-${RUN_ID}`, matter_id: testMatterId, title: 'K1', category: 'research', content_uri: '', source: '', version: 'v1', status: 'recorded' } })
  } catch (e) {
    // ignore if knowledge model unavailable for some test environments
  }
  await prisma.timeline.create({ data: { timeline_id: `tl-${RUN_ID}`, matter_id: testMatterId, event_type: 'note', event_time: new Date().toISOString(), description: 'initial', source: 'test', status: 'recorded' } })
})

afterAll(async () => {
  await prisma.task.deleteMany({ where: { matter_id: testMatterId } })
  await prisma.document.deleteMany({ where: { matter_id: testMatterId } })
  await prisma.evidence.deleteMany({ where: { matter_id: testMatterId } })
  try {
    await prisma.knowledge.deleteMany({ where: { matter_id: testMatterId } })
  } catch (e) {
    // ignore
  }
  // cleanup material fixture
  try {
    await prisma.material.deleteMany({ where: { material_id: `m-${RUN_ID}` } })
  } catch (e) {
    // ignore
  }
  await prisma.timeline.deleteMany({ where: { matter_id: testMatterId } })
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('Matter Snapshot Runtime', () => {
  it('builds a snapshot and API returns it', async () => {
    const { default: MatterSnapshotRuntime } = await import('../src/runtime/matterSnapshotRuntime')
    const runtime = new MatterSnapshotRuntime(prisma)
    const snap = await runtime.build(testMatterId)
    expect(snap).toBeTruthy()
    expect(snap.matter).toBeTruthy()
    expect(snap.workflow).toBeTruthy()
    expect(snap.tasks).toBeTruthy()
    expect(snap.documents).toBeTruthy()
    expect(snap.evidence).toBeTruthy()
    expect(snap.research).toBeTruthy()
    expect(snap.timeline).toBeTruthy()
    expect(snap.ai).toBeTruthy()
    expect(snap.generated_at).toBeTruthy()

    const res = await app.inject({ method: 'GET', url: `/matters/${testMatterId}/runtime` })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.matter).toBeTruthy()
  })
})
