export interface WorkflowInstance {
  workflow_instance_id: string
  matter_id: string
  current_stage: string
  status: 'not_started' | 'in_progress' | 'completed' | 'paused'
  current_step?: string | null
  completed_steps: string[]
  pending_steps: string[]
  history: Array<{ at: string; action: string; detail?: any }>
  created_at?: string
  updated_at?: string
}

export default WorkflowInstance
