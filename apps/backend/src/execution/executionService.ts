import type { PrismaClient } from '@lawdesk/database'
import ExecutionRepository from './executionRepository'
import { ExecutionQueueItem as ExecutionQueueType } from './executionTypes'
import { startQueueItem, pauseQueueItem, completeQueueItem } from './executionEngine'

export default class ExecutionService {
  repo: ExecutionRepository

  constructor(prisma: PrismaClient) {
    this.repo = new ExecutionRepository(prisma)
  }

  async loadQueueState(matter_id: string) {
    return this.repo.getByMatter(matter_id)
  }

  async saveQueueItem(item: {
    matter_id: string
    queue_id: string
    action_id: string
    work_id?: string | null
    slot: string
    execution_status: string
  }) {
    return this.repo.upsert(item)
  }

  async start(queue_id: string) {
    const existing = await this.repo.getByQueueId(queue_id)
    if (!existing) throw new Error('Not found')

    const current = {
      queue_id: existing.queue_id,
      action_id: existing.action_id,
      slot: existing.slot as any,
      execution_status: existing.execution_status as any,
    } as ExecutionQueueType

    const next = startQueueItem(current)
    await this.repo.updateStatus(queue_id, next.execution_status)
    return next
  }

  async pause(queue_id: string) {
    const existing = await this.repo.getByQueueId(queue_id)
    if (!existing) throw new Error('Not found')

    const current = {
      queue_id: existing.queue_id,
      action_id: existing.action_id,
      slot: existing.slot as any,
      execution_status: existing.execution_status as any,
    } as ExecutionQueueType

    const next = pauseQueueItem(current)
    await this.repo.updateStatus(queue_id, next.execution_status)
    return next
  }

  async complete(queue_id: string) {
    const existing = await this.repo.getByQueueId(queue_id)
    if (!existing) throw new Error('Not found')

    const current = {
      queue_id: existing.queue_id,
      action_id: existing.action_id,
      slot: existing.slot as any,
      execution_status: existing.execution_status as any,
    } as ExecutionQueueType

    const next = completeQueueItem(current)
    await this.repo.updateStatus(queue_id, next.execution_status)
    return next
  }
}
