import { WorkflowInstance } from '../models/workflowInstance'

const STORAGE: Record<string, WorkflowInstance> = {}

function genId() {
  return `wfi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`
}

export class WorkflowInstanceRepository {
  async getByMatter(matter_id: string): Promise<WorkflowInstance | null> {
    return Object.values(STORAGE).find((s) => s.matter_id === matter_id) || null
  }

  async create(instance: Omit<WorkflowInstance, 'workflow_instance_id' | 'created_at' | 'updated_at'>) {
    const id = genId()
    const now = new Date().toISOString()
    const record: WorkflowInstance = { ...instance, workflow_instance_id: id, created_at: now, updated_at: now }
    STORAGE[id] = record
    return record
  }

  async update(id: string, patch: Partial<WorkflowInstance>) {
    const existing = STORAGE[id]
    if (!existing) throw new Error('not found')
    const updated = { ...existing, ...patch, updated_at: new Date().toISOString() }
    STORAGE[id] = updated
    return updated
  }
}

export default WorkflowInstanceRepository
