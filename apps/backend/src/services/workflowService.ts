import WorkflowRepository from '../repositories/workflowRepository'
import { WorkflowDefinition } from '../models/workflowDefinition'

export class WorkflowService {
  repo: WorkflowRepository
  constructor() {
    this.repo = new WorkflowRepository()
  }

  async list(): Promise<WorkflowDefinition[]> {
    return this.repo.list()
  }

  async get(workflow_id: string): Promise<WorkflowDefinition | null> {
    return this.repo.get(workflow_id)
  }

  async create(payload: Omit<WorkflowDefinition, 'workflow_id' | 'created_at' | 'updated_at'>) {
    // basic validation
    if (!payload.name || !payload.trigger || !Array.isArray(payload.steps)) {
      throw new Error('invalid payload')
    }
    return this.repo.create(payload)
  }
}

export default WorkflowService
