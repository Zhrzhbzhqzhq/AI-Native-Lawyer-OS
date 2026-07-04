export interface WorkflowStep {
  step_id: string
  action: string
  requires_confirmation: boolean
  next?: string | null
}

export interface WorkflowDefinition {
  workflow_id: string
  name: string
  trigger: string
  steps: WorkflowStep[]
  created_at?: string
  updated_at?: string
}

export default WorkflowDefinition
