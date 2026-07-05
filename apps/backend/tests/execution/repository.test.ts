import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { createPrismaClient } from '@lawdesk/database'
import ExecutionRepository from '../../src/execution/executionRepository'

let prisma: any
let repo: ExecutionRepository
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const TEST_MATTER = `test-matter-exe-repo-${RUN_ID}`

beforeAll(async () => {
  prisma = createPrismaClient()
  repo = new ExecutionRepository(prisma)
  // cleanup any leftovers
  await prisma.executionQueueItem.deleteMany({ where: { queue_id: { startsWith: `test-q-${RUN_ID}` } } }).catch(() => {})
})

afterAll(async () => {
  await prisma.executionQueueItem.deleteMany({ where: { matter_id: TEST_MATTER } }).catch(() => {})
  await prisma.$disconnect()
})

describe('ExecutionRepository CRUD', () => {
  it('create -> getByQueueId -> update -> getByMatter -> upsert', async () => {
    const qid = `test-q-${RUN_ID}-1`
    const row = await repo.create({
      matter_id: TEST_MATTER,
      queue_id: qid,
      action_id: 'act-1',
      work_id: null,
      slot: 'NOW',
      execution_status: 'PENDING',
    })

    expect(row.queue_id).toBe(qid)
    const fetched = await repo.getByQueueId(qid)
    expect(fetched?.queue_id).toBe(qid)

    const updated = await repo.update({ queue_id: qid, execution_status: 'RUNNING' })
    expect(updated.execution_status).toBe('RUNNING')

    const list = await repo.getByMatter(TEST_MATTER)
    expect(Array.isArray(list)).toBe(true)
    expect(list.find((x:any) => x.queue_id === qid)).toBeTruthy()

    // upsert should update existing
    const up = await repo.upsert({ matter_id: TEST_MATTER, queue_id: qid, action_id: 'act-1', work_id: null, slot: 'NOW', execution_status: 'DONE' })
    expect(up.execution_status).toBe('DONE')

    // cleanup
    await prisma.executionQueueItem.deleteMany({ where: { queue_id: qid } }).catch(() => {})
  })
})
