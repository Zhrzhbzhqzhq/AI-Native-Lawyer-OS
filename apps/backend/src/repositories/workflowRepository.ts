import { WorkflowDefinition } from '../models/workflowDefinition'

const STORAGE: Record<string, WorkflowDefinition> = {}

function genId() {
  return `wf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`
}

export class WorkflowRepository {
  async list(): Promise<WorkflowDefinition[]> {
    return Object.values(STORAGE)
  }

  async get(workflow_id: string): Promise<WorkflowDefinition | null> {
    return STORAGE[workflow_id] || null
  }

  async create(payload: Omit<WorkflowDefinition, 'workflow_id' | 'created_at' | 'updated_at'>): Promise<WorkflowDefinition> {
    const workflow_id = genId()
    const now = new Date().toISOString()
    const record: WorkflowDefinition = { ...payload, workflow_id, created_at: now, updated_at: now }
    STORAGE[workflow_id] = record
    return record
  }
}

export default WorkflowRepository
