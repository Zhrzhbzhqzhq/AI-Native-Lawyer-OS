import { describe, it, expect } from 'vitest'
import { ExecutionQueueItem } from '../../src/execution/executionTypes'
import { startQueueItem, completeQueueItem, pauseQueueItem } from '../../src/execution/executionEngine'

describe('executionEngine v1', () => {
  it('start: PENDING -> RUNNING (returns new object)', () => {
    const item: ExecutionQueueItem = { queue_id: 'q1', action_id: 'a1', slot: 'NOW', execution_status: 'PENDING' }
    const res = startQueueItem(item)
    expect(res.execution_status).toBe('RUNNING')
    // original must not be mutated
    expect(item.execution_status).toBe('PENDING')
    expect(res).not.toBe(item)
  })

  it('start: DONE stays DONE', () => {
    const item: ExecutionQueueItem = { queue_id: 'q2', action_id: 'a2', slot: 'TODAY', execution_status: 'DONE' }
    const res = startQueueItem(item)
    expect(res.execution_status).toBe('DONE')
    expect(res).not.toBe(item)
  })

  it('complete: RUNNING -> DONE', () => {
    const item: ExecutionQueueItem = { queue_id: 'q3', action_id: 'a3', slot: 'NOW', execution_status: 'RUNNING' }
    const res = completeQueueItem(item)
    expect(res.execution_status).toBe('DONE')
    expect(item.execution_status).toBe('RUNNING')
  })

  it('complete: PENDING stays PENDING', () => {
    const item: ExecutionQueueItem = { queue_id: 'q4', action_id: 'a4', slot: 'LATER', execution_status: 'PENDING' }
    const res = completeQueueItem(item)
    expect(res.execution_status).toBe('PENDING')
    expect(res).not.toBe(item)
  })

  it('pause: RUNNING -> PENDING', () => {
    const item: ExecutionQueueItem = { queue_id: 'q5', action_id: 'a5', slot: 'TODAY', execution_status: 'RUNNING' }
    const res = pauseQueueItem(item)
    expect(res.execution_status).toBe('PENDING')
    expect(item.execution_status).toBe('RUNNING')
  })

  it('pause: DONE stays DONE', () => {
    const item: ExecutionQueueItem = { queue_id: 'q6', action_id: 'a6', slot: 'LATER', execution_status: 'DONE' }
    const res = pauseQueueItem(item)
    expect(res.execution_status).toBe('DONE')
    expect(res).not.toBe(item)
  })
})
