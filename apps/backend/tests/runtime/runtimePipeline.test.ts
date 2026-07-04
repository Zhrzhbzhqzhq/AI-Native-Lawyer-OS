import { describe, it, expect } from 'vitest'
import analyzeRuntimeState from '../../src/runtime/runtimeAnalyzer'
import decideFromRuntimeState from '../../src/runtime/runtimeDecisionEngine'
import planFromRuntimeDecision from '../../src/runtime/runtimePlannerEngine'
import assignFromRuntimePlan from '../../src/runtime/runtimeChiefEngine'
import worksFromRuntimePlan from '../../src/runtime/runtimeLegalEngine'
import actionsFromRuntimeWorks from '../../src/runtime/runtimeExecutorEngine'
import { RuntimeStateCode } from '../../src/runtime/runtimeTypes'

describe('runtime pipeline integration', () => {
  it('full chain from snapshot_facts -> runtime_actions', () => {
    const snapshotFacts = {
      counts: { evidence: 0, research: 0 },
      documents: { draft: 1, final: 0, archived: 0 },
      evidence: { weak: 0 },
      activity: { recent: 0 },
    }

    const runtime_state = analyzeRuntimeState(snapshotFacts)
    expect(Array.isArray(runtime_state)).toBe(true)
    expect(runtime_state.map(s => s.code)).toContain(RuntimeStateCode.NO_RESEARCH)

    const runtime_decision = decideFromRuntimeState(runtime_state)
    const runtime_plan = planFromRuntimeDecision(runtime_decision)
    expect(typeof runtime_plan.generated_at).toBe('string')

    const runtime_assignments = assignFromRuntimePlan(runtime_plan)
    const runtime_works = worksFromRuntimePlan(runtime_plan)
    const runtime_actions = actionsFromRuntimeWorks(runtime_works)

    expect(Array.isArray(runtime_assignments)).toBe(true)
    expect(Array.isArray(runtime_works)).toBe(true)
    expect(Array.isArray(runtime_actions)).toBe(true)
  })
})
