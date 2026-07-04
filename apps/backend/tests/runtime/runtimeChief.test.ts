import { describe, it, expect } from 'vitest'
import assignFromRuntimePlan from '../../src/runtime/runtimeChiefEngine'

describe('runtimeChiefEngine', () => {
  it('buckets evidence and document steps correctly', () => {
    const plan: any = { steps: ['Identify missing evidence types', 'Open draft documents and check completeness', 'Periodically check for new events'] }
    const assignments = assignFromRuntimePlan(plan)
    const agents = assignments.map(a => a.agent)
    expect(agents).toContain('Evidence')
    expect(agents).toContain('Document')
    expect(agents).toContain('Monitor')
  })

  it('returns empty when no steps', () => {
    const assignments = assignFromRuntimePlan({ steps: [] } as any)
    expect(Array.isArray(assignments)).toBe(true)
    expect(assignments.length).toBe(0)
  })
})
