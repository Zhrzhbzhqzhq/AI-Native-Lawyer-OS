// Local lightweight type to avoid circular imports
export type MatterSnapshot = {
  matter?: any
  tasks?: { total?: number, open?: number }
  documents?: { total?: number, draft?: number, final?: number }
  evidence?: { total?: number }
  research?: { total?: number }
}

export type MatterState = {
  current_stage: string
  completion: number
  next_step: string | null
  blocking: string[]
  signals: string[]
}

const STAGE_NEXT_STEP: Record<string, string | null> = {
  intake: 'Complete intake and confirm whether to accept the matter',
  accepted: 'Collect core evidence and create initial research task',
  evidence_collection: 'Review evidence and identify missing proof',
  research: 'Prepare legal research summary and draft strategy',
  drafting: 'Review draft documents and prepare for filing',
  ready_to_file: 'Confirm lawyer approval and prepare filing checklist',
  filed: 'Track court schedule and hearing preparation',
  hearing: 'Prepare hearing outline and evidence presentation',
  enforcement: 'Prepare enforcement materials',
  closing: 'Prepare closing summary and archive',
  archived: null,
}

export class MatterStateEngine {
  static evaluate(snapshot: MatterSnapshot): MatterState {
    const s = snapshot
    const blocking: string[] = []
    const signals: string[] = []

    const hasEvidence = (s.evidence?.total || 0) > 0
    const hasResearch = (s.research?.total || 0) > 0
    const hasDraft = (s.documents?.draft || 0) > 0 || (s.documents?.total || 0) > 0
    const hasFinal = (s.documents?.final || 0) > 0
    const hasOpenTask = (s.tasks?.open || 0) > 0

    if (hasEvidence) signals.push('HAS_EVIDENCE')
    if (hasResearch) signals.push('HAS_RESEARCH')
    if (hasDraft) signals.push('HAS_DRAFT_DOCUMENT')
    if (hasFinal) signals.push('HAS_FINAL_DOCUMENT')
    if (hasOpenTask) signals.push('HAS_OPEN_TASK')
    if (String(s.matter?.status || '').toLowerCase() === 'archived') signals.push('ARCHIVED')

    // blocking rules
    if (!hasEvidence) blocking.push('No evidence uploaded')
    if (!hasResearch) blocking.push('No legal research recorded')
    if ((s.documents?.total || 0) === 0) blocking.push('No draft document prepared')
    if (!hasOpenTask && String(s.matter?.status || '').toLowerCase() !== 'archived') blocking.push('No active task')

    // Stage rules (priority order)
    let current_stage = 'intake'
    let completion = 10

    if (String(s.matter?.status || '').toLowerCase() === 'archived') {
      current_stage = 'archived'
      completion = 100
    } else if ((s.documents?.final || 0) > 0) {
      current_stage = 'ready_to_file'
      completion = Math.max(70, completion)
    } else if ((s.documents?.draft || 0) > 0) {
      current_stage = 'drafting'
      completion = Math.max(55, completion)
    } else if ((s.research?.total || 0) > 0) {
      current_stage = 'research'
      completion = Math.max(40, completion)
    } else if ((s.evidence?.total || 0) > 0) {
      current_stage = 'evidence_collection'
      completion = Math.max(30, completion)
    } else if ((s.tasks?.open || 0) > 0) {
      current_stage = 'accepted'
      completion = Math.max(20, completion)
    } else {
      current_stage = 'intake'
      completion = 10
    }

    const next_step = STAGE_NEXT_STEP[current_stage] ?? null

    return {
      current_stage,
      completion,
      next_step,
      blocking,
      signals,
    }
  }
}

export default MatterStateEngine
