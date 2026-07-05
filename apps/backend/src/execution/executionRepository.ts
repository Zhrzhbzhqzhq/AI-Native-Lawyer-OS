import type { PrismaClient } from '@lawdesk/database'

export interface ExecutionQueueRow {
  id: string
  matter_id: string
  queue_id: string
  action_id: string
  work_id?: string | null
  slot: string
  execution_status: string
  created_at: Date
  updated_at: Date
}

export default class ExecutionRepository {
  prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async getByQueueId(queue_id: string): Promise<ExecutionQueueRow | null> {
    return this.prisma.executionQueueItem.findUnique({ where: { queue_id } }) as any
  }

  async getByMatter(matter_id: string): Promise<ExecutionQueueRow[]> {
    return this.prisma.executionQueueItem.findMany({ where: { matter_id }, orderBy: { created_at: 'asc' } }) as any
  }

  async upsert(item: {
    matter_id: string
    queue_id: string
    action_id: string
    work_id?: string | null
    slot: string
    execution_status: string
  }): Promise<ExecutionQueueRow> {
    const payload = {
      matter_id: item.matter_id,
      queue_id: item.queue_id,
      action_id: item.action_id,
      work_id: item.work_id ?? null,
      slot: item.slot,
      execution_status: item.execution_status,
    }

    return this.prisma.executionQueueItem.upsert({
      where: { queue_id: item.queue_id },
      create: payload as any,
      update: payload as any,
    }) as any
  }

  async updateStatus(queue_id: string, status: string): Promise<ExecutionQueueRow> {
    return this.prisma.executionQueueItem.update({ where: { queue_id }, data: { execution_status: status } }) as any
  }

  async create(item: {
    matter_id: string
    queue_id: string
    action_id: string
    work_id?: string | null
    slot: string
    execution_status: string
  }): Promise<ExecutionQueueRow> {
    const payload = {
      matter_id: item.matter_id,
      queue_id: item.queue_id,
      action_id: item.action_id,
      work_id: item.work_id ?? null,
      slot: item.slot,
      execution_status: item.execution_status,
    }
    return this.prisma.executionQueueItem.create({ data: payload as any }) as any
  }

  async update(item: {
    queue_id: string
    action_id?: string
    work_id?: string | null
    slot?: string
    execution_status?: string
  }): Promise<ExecutionQueueRow> {
    const data: any = {}
    if (item.action_id !== undefined) data.action_id = item.action_id
    if (item.work_id !== undefined) data.work_id = item.work_id
    if (item.slot !== undefined) data.slot = item.slot
    if (item.execution_status !== undefined) data.execution_status = item.execution_status
    return this.prisma.executionQueueItem.update({ where: { queue_id: item.queue_id }, data }) as any
  }
}
