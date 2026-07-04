import { ExecutionQueueItem } from './executionTypes'

export function startQueueItem(item: ExecutionQueueItem): ExecutionQueueItem {
  // Return a new object; do not mutate input
  if (item.execution_status === 'PENDING') {
    return { ...item, execution_status: 'RUNNING' }
  }
  // RUNNING stays RUNNING, DONE stays DONE
  return { ...item }
}

export function completeQueueItem(item: ExecutionQueueItem): ExecutionQueueItem {
  if (item.execution_status === 'RUNNING') {
    return { ...item, execution_status: 'DONE' }
  }
  // PENDING stays PENDING, DONE stays DONE
  return { ...item }
}

export function pauseQueueItem(item: ExecutionQueueItem): ExecutionQueueItem {
  if (item.execution_status === 'RUNNING') {
    return { ...item, execution_status: 'PENDING' }
  }
  // PENDING stays PENDING, DONE stays DONE
  return { ...item }
}

export default {
  startQueueItem,
  completeQueueItem,
  pauseQueueItem,
}
