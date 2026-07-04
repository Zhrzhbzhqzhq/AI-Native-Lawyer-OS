export interface ActionProposal {
  proposal_id: string;
  matter_id: string;
  action: string;
  title: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  created_at: string;
  decided_at?: string | null;
  updated_at?: string | null;
  source?: string;
  planner_provider?: string;
  planner_model?: string;
}

export default ActionProposal;
