import { describe, it, expect } from 'vitest'
import decideFromRuntimeState from '../../src/runtime/runtimeDecisionEngine'
import { RuntimeDecisionCode, RuntimeStateCode } from '../../src/runtime/runtimeTypes'

describe('runtimeDecisionEngine', () => {
  it('selects COLLECT_EVIDENCE when NEEDS_EVIDENCE present', () => {
    const runtimeState = [{ code: RuntimeStateCode.NEEDS_EVIDENCE, value: true }]
    const decision = decideFromRuntimeState(runtimeState as any)
    expect(decision.code).toBe(RuntimeDecisionCode.COLLECT_EVIDENCE)
    expect(Array.isArray(decision.source)).toBe(true)
  })

  it('follows priority when multiple states present', () => {
    const runtimeState = [
      { code: RuntimeStateCode.HAS_WEAK_EVIDENCE, value: 2 },
      { code: RuntimeStateCode.NEEDS_EVIDENCE, value: true },
    ]
    const decision = decideFromRuntimeState(runtimeState as any)
    // COLLECT_EVIDENCE has higher priority than REVIEW_EVIDENCE
    expect(decision.code).toBe(RuntimeDecisionCode.COLLECT_EVIDENCE)
    expect(decision.source).toEqual([RuntimeStateCode.HAS_WEAK_EVIDENCE, RuntimeStateCode.NEEDS_EVIDENCE])
  })

  it('returns NO_ACTION when no states', () => {
    const decision = decideFromRuntimeState([] as any)
    expect(decision.code).toBe(RuntimeDecisionCode.NO_ACTION)
    expect(decision.source).toEqual([])
  })
})
