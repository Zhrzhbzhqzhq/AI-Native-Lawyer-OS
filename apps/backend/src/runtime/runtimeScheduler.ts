import type { RuntimeAction } from './runtimeExecutorEngine'

export type TodayQueueItem = {
  queue_id: string
  action_id: string
  work_id: string
  slot: 'NOW' | 'TODAY' | 'LATER'
  status: 'READY' | 'BLOCKED'
  order: number
}

export default function scheduleRuntimeActions(actions: RuntimeAction[] = []): TodayQueueItem[] {
  if (!Array.isArray(actions) || actions.length === 0) return []

  // find index of first READY
  let firstReadyIndex = -1
  for (let i = 0; i < actions.length; i++) {
    if (String(actions[i].status || '').toUpperCase() === 'READY') {
      firstReadyIndex = i
      break
    }
  }

  const out: TodayQueueItem[] = actions.map((a, idx) => {
    const status = String(a.status || '').toUpperCase() === 'BLOCKED' ? 'BLOCKED' : 'READY'
    let slot: TodayQueueItem['slot'] = 'TODAY'
    if (status === 'BLOCKED') slot = 'LATER'
    else {
      if (idx === firstReadyIndex) slot = 'NOW'
      else slot = 'TODAY'
    }

    return {
      queue_id: `queue-${a.action_id}`,
      action_id: a.action_id,
      work_id: a.work_id,
      slot,
      status: status as 'READY' | 'BLOCKED',
      order: idx,
    }
  })

  return out
}

export { scheduleRuntimeActions }
