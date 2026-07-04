import WorkflowInstanceRepository from '../repositories/workflowInstanceRepository'
import { WorkflowInstance } from '../models/workflowInstance'

const DEFAULT_STAGES = ['Consultation','Accepted','Evidence','Research','Documents','Hearing','Execution','Closed']

export class WorkflowInstanceService {
  repo: WorkflowInstanceRepository
  constructor() {
    this.repo = new WorkflowInstanceRepository()
  }

  async getForMatter(matter_id: string) {
    return this.repo.getByMatter(matter_id)
  }

  async start(matter_id: string) {
    const existing = await this.repo.getByMatter(matter_id)
    if (existing) return existing

    const pending = DEFAULT_STAGES.slice()
    const current = pending.shift()!
    const instance: Omit<WorkflowInstance, 'workflow_instance_id' | 'created_at' | 'updated_at'> = {
      matter_id,
      current_stage: current,
      status: 'in_progress',
      current_step: current,
      completed_steps: [],
      pending_steps: pending,
      history: [{ at: new Date().toISOString(), action: 'started', detail: { stage: current } }]
    }
    return this.repo.create(instance)
  }

  async advance(matter_id: string) {
    const instance = await this.repo.getByMatter(matter_id)
    if (!instance) throw new Error('not_started')
    if (instance.status === 'completed') return instance

    const next = instance.pending_steps.shift()
    const completed = (instance.completed_steps || []).concat([instance.current_stage])
    const updated: Partial<WorkflowInstance> = {
      current_stage: next || instance.current_stage,
      current_step: next || null,
      completed_steps: completed,
      pending_steps: instance.pending_steps,
      status: next ? 'in_progress' : 'completed',
      history: (instance.history || []).concat([{ at: new Date().toISOString(), action: 'advanced', detail: { from: instance.current_stage, to: next || 'none' } }])
    }
    return this.repo.update(instance.workflow_instance_id, updated)
  }
}

export default WorkflowInstanceService
