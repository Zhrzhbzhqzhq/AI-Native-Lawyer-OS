import type { RuntimePlan } from './runtimePlannerEngine'

export type AssignmentAgent = 'Evidence' | 'Research' | 'Document' | 'Monitor'

export type RuntimeAssignment = {
  agent: AssignmentAgent
  tasks: string[]
}

// Deterministic keyword-based mapper: map plan.steps to agents
export default function assignFromRuntimePlan(plan: RuntimePlan): RuntimeAssignment[] {
  const steps = plan?.steps || []

  const buckets: Record<AssignmentAgent, string[]> = {
    Evidence: [],
    Research: [],
    Document: [],
    Monitor: [],
  }

  for (const step of steps) {
    const s = String(step || '').toLowerCase()

    // Evidence keywords
    if (s.includes('evidence') || s.includes('material') || s.includes('attach') || s.includes('evidence entries')) {
      buckets.Evidence.push(step)
      continue
    }

    // Research keywords
    if (s.includes('research') || s.includes('legal') || s.includes('questions') || s.includes('research tasks')) {
      buckets.Research.push(step)
      continue
    }

    // Document keywords
    if (s.includes('document') || s.includes('draft') || s.includes('finalize') || s.includes('align') || s.includes('drafts') || s.includes('review')) {
      buckets.Document.push(step)
      continue
    }

    // Monitor / fallback
    buckets.Monitor.push(step)
  }

  const assignments: RuntimeAssignment[] = []
  for (const agent of ['Evidence', 'Research', 'Document', 'Monitor'] as AssignmentAgent[]) {
    if ((buckets as any)[agent].length > 0) {
      assignments.push({ agent, tasks: (buckets as any)[agent] })
    }
  }

  return assignments
}
