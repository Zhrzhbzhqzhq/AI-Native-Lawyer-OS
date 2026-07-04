import { describe, it, expect } from 'vitest'
import scheduleRuntimeActions from '../../src/runtime/runtimeScheduler'

describe('runtimeScheduler', () => {
  it('returns empty array for empty input', () => {
    expect(scheduleRuntimeActions([])).toEqual([])
  })

  it('single READY -> NOW', () => {
    const actions = [{ action_id: 'a1', work_id: 'w1', status: 'READY' } as any]
    const q = scheduleRuntimeActions(actions)
    expect(q.length).toBe(1)
    expect(q[0].slot).toBe('NOW')
    expect(q[0].queue_id).toBe('queue-a1')
    expect(q[0].order).toBe(0)
  })

  it('multiple READY -> first NOW others TODAY', () => {
    const actions = [
      { action_id: 'a1', work_id: 'w1', status: 'READY' },
      { action_id: 'a2', work_id: 'w2', status: 'READY' },
      { action_id: 'a3', work_id: 'w3', status: 'READY' },
    ] as any
    const q = scheduleRuntimeActions(actions)
    expect(q[0].slot).toBe('NOW')
    expect(q[1].slot).toBe('TODAY')
    expect(q[2].slot).toBe('TODAY')
    expect(q.map(r=>r.order)).toEqual([0,1,2])
  })

  it('BLOCKED -> LATER', () => {
    const actions = [
      { action_id: 'a1', work_id: 'w1', status: 'BLOCKED' },
      { action_id: 'a2', work_id: 'w2', status: 'BLOCKED' },
    ] as any
    const q = scheduleRuntimeActions(actions)
    expect(q.every(i => i.slot === 'LATER')).toBe(true)
    expect(q[0].queue_id).toBe('queue-a1')
  })

  it('mixed actions preserve order and assign slots', () => {
    const actions = [
      { action_id: 'a1', work_id: 'w1', status: 'BLOCKED' },
      { action_id: 'a2', work_id: 'w2', status: 'READY' },
      { action_id: 'a3', work_id: 'w3', status: 'READY' },
      { action_id: 'a4', work_id: 'w4', status: 'BLOCKED' },
    ] as any
    const q = scheduleRuntimeActions(actions)
    expect(q.map(r=>r.action_id)).toEqual(['a1','a2','a3','a4'])
    expect(q[0].slot).toBe('LATER')
    expect(q[1].slot).toBe('NOW')
    expect(q[2].slot).toBe('TODAY')
    expect(q[3].slot).toBe('LATER')
  })
})
