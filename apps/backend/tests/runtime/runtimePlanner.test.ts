import { describe, it, expect } from 'vitest'
import planFromRuntimeDecision from '../../src/runtime/runtimePlannerEngine'
import { RuntimeDecisionCode } from '../../src/runtime/runtimeTypes'

describe('runtimePlannerEngine', () => {
  it('returns a plan for COLLECT_EVIDENCE', () => {
    const decision: any = { code: RuntimeDecisionCode.COLLECT_EVIDENCE, source: [] }
    const plan = planFromRuntimeDecision(decision)
    expect(plan.goal).toBeTruthy()
    expect(plan.priority).toBe('HIGH')
    expect(Array.isArray(plan.steps)).toBe(true)
    expect(typeof plan.generated_at).toBe('string')
  })

  it('NO_ACTION yields empty steps and LOW priority', () => {
    const decision: any = { code: RuntimeDecisionCode.NO_ACTION, source: [] }
    const plan = planFromRuntimeDecision(decision)
    expect(plan.steps.length).toBe(0)
    expect(plan.priority).toBe('LOW')
    expect(typeof plan.generated_at).toBe('string')
  })
})
