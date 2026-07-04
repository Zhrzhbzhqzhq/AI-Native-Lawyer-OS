import { describe, it, expect } from 'vitest'
import worksFromRuntimePlan from '../../src/runtime/runtimeLegalEngine'

describe('runtimeLegalEngine', () => {
  it('produces evidence and document works from steps', () => {
    const plan: any = { steps: ['Identify missing evidence types', 'Open draft documents and check completeness'] }
    const works = worksFromRuntimePlan(plan)
    const types = works.map(w => w.type)
    expect(types).toContain('EvidenceWork')
    expect(types).toContain('DocumentWork')
    // ensure work_id stable format
    expect(works.find(w => w.type === 'EvidenceWork')?.work_id).toBeTruthy()
  })

  it('dedupes multiple evidence steps into single EvidenceWork', () => {
    const plan: any = { steps: ['evidence 1', 'evidence 2', 'evidence review'] }
    const works = worksFromRuntimePlan(plan)
    const evidenceWorks = works.filter(w => w.type === 'EvidenceWork')
    expect(evidenceWorks.length).toBe(1)
  })
})
