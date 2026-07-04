import { describe, it, expect } from 'vitest'
import analyzeRuntimeState from '../../src/runtime/runtimeAnalyzer'
import { RuntimeStateCode } from '../../src/runtime/runtimeTypes'

describe('runtimeAnalyzer', () => {
  it('detects needs evidence and no research and recent activity', () => {
    const snapshotFacts = {
      counts: { evidence: 0, research: 0 },
      documents: { draft: 0, final: 0, archived: 0 },
      evidence: { weak: 0 },
      activity: { recent: 5 },
    }

    const states = analyzeRuntimeState(snapshotFacts)
    const codes = states.map(s => s.code)

    expect(codes).toContain(RuntimeStateCode.NEEDS_EVIDENCE)
    expect(codes).toContain(RuntimeStateCode.NO_RESEARCH)
    expect(codes).toContain(RuntimeStateCode.RECENT_ACTIVITY)
  })

  it('emits HAS_WEAK_EVIDENCE when weak > 0 and NO_RECENT_ACTIVITY when none', () => {
    const snapshotFacts = {
      counts: { evidence: 2, research: 1 },
      documents: { draft: 1, final: 0, archived: 0 },
      evidence: { weak: 3 },
      activity: { recent: 0 },
    }

    const states = analyzeRuntimeState(snapshotFacts)
    const found = (s: any) => states.find(x => x.code === s)

    expect(found(RuntimeStateCode.HAS_WEAK_EVIDENCE)).toBeTruthy()
    expect(found(RuntimeStateCode.HAS_DRAFT_DOCUMENTS)).toBeTruthy()
    expect(found(RuntimeStateCode.NO_RECENT_ACTIVITY)).toBeTruthy()
  })
})
