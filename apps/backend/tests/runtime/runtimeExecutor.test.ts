import { describe, it, expect } from 'vitest'
import actionsFromRuntimeWorks from '../../src/runtime/runtimeExecutorEngine'

describe('runtimeExecutorEngine', () => {
  it('maps works to actions with stable ids and status mapping', () => {
    const works = [
      { work_id: 'work-evidence-collection', type: 'EvidenceWork', status: 'PENDING' },
      { work_id: 'work-research-law', type: 'ResearchWork', status: 'BLOCKED' },
      { work_id: 'work-evidence-collection', type: 'EvidenceWork', status: 'PENDING' }, // duplicate
    ] as any

    const actions = actionsFromRuntimeWorks(works)
    expect(actions.length).toBe(2)
    const a1 = actions.find(a => a.work_id === 'work-evidence-collection')
    expect(a1).toBeTruthy()
    expect(a1?.action_id).toBe('action-work-evidence-collection')
    expect(a1?.status).toBe('READY')
    expect(a1?.payload).toBeTruthy()
    expect((a1 as any).payload.target_workspace).toBe('evidence')
    expect((a1 as any).payload.target_type).toBe('EvidenceWork')
    expect((a1 as any).payload.target_id).toBeNull()

    const a2 = actions.find(a => a.work_id === 'work-research-law')
    expect(a2).toBeTruthy()
    expect(a2?.status).toBe('BLOCKED')
    expect(a2?.type).toBe('PrepareResearchAction')
    expect(a2?.payload).toBeTruthy()
    expect((a2 as any).payload.target_workspace).toBe('runtime')
    expect((a2 as any).payload.target_type).toBe('ResearchWork')
    expect((a2 as any).payload.target_id).toBeNull()
  })

  it('returns empty array for invalid input', () => {
    expect(actionsFromRuntimeWorks(null as any)).toEqual([])
  })
})
