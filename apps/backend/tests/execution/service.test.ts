import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { createPrismaClient } from '@lawdesk/database'
import ExecutionRepository from '../../src/execution/executionRepository'
import ExecutionService from '../../src/execution/executionService'

let prisma: any
let repo: ExecutionRepository
let svc: ExecutionService
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const TEST_MATTER = `test-matter-exe-svc-${RUN_ID}`

beforeAll(async () => {
  prisma = createPrismaClient()
  repo = new ExecutionRepository(prisma)
  svc = new ExecutionService(prisma)
  // cleanup
  await prisma.executionQueueItem.deleteMany({ where: { queue_id: { startsWith: `test-q-svc-${RUN_ID}` } } }).catch(() => {})
})

afterAll(async () => {
  await prisma.executionQueueItem.deleteMany({ where: { matter_id: TEST_MATTER } }).catch(() => {})
  await prisma.$disconnect()
})

describe('ExecutionService transitions', () => {
  it('start: PENDING -> RUNNING', async () => {
    const qid = `test-q-svc-${RUN_ID}-1`
    await repo.create({ matter_id: TEST_MATTER, queue_id: qid, action_id: 'a1', slot: 'NOW', work_id: null, execution_status: 'PENDING' })
    const res = await svc.start(qid)
    expect(res.execution_status).toBe('RUNNING')
    const fetched = await repo.getByQueueId(qid)
    expect(fetched?.execution_status).toBe('RUNNING')
  })

  it('pause: RUNNING -> PENDING', async () => {
    const qid = `test-q-svc-${RUN_ID}-2`
    await repo.create({ matter_id: TEST_MATTER, queue_id: qid, action_id: 'a2', slot: 'TODAY', work_id: null, execution_status: 'RUNNING' })
    const res = await svc.pause(qid)
    expect(res.execution_status).toBe('PENDING')
    const fetched = await repo.getByQueueId(qid)
    expect(fetched?.execution_status).toBe('PENDING')
  })

  it('complete: RUNNING -> DONE', async () => {
    const qid = `test-q-svc-${RUN_ID}-3`
    await repo.create({ matter_id: TEST_MATTER, queue_id: qid, action_id: 'a3', slot: 'LATER', work_id: null, execution_status: 'RUNNING' })
    const res = await svc.complete(qid)
    expect(res.execution_status).toBe('DONE')
    const fetched = await repo.getByQueueId(qid)
    expect(fetched?.execution_status).toBe('DONE')
  })

  it('illegal transitions: start on DONE stays DONE', async () => {
    const qid = `test-q-svc-${RUN_ID}-4`
    await repo.create({ matter_id: TEST_MATTER, queue_id: qid, action_id: 'a4', slot: 'NOW', work_id: null, execution_status: 'DONE' })
    const res = await svc.start(qid)
    expect(res.execution_status).toBe('DONE')
    const fetched = await repo.getByQueueId(qid)
    expect(fetched?.execution_status).toBe('DONE')
  })

  it('non-existent queue_id should throw', async () => {
    await expect(svc.start('no-such-queue')).rejects.toThrow()
    await expect(svc.pause('no-such-queue')).rejects.toThrow()
    await expect(svc.complete('no-such-queue')).rejects.toThrow()
  })
})
