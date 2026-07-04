export type Slot = 'NOW' | 'TODAY' | 'LATER'
export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'DONE'

export interface ExecutionQueueItem {
  queue_id: string
  action_id: string
  slot: Slot
  execution_status: ExecutionStatus
}

export default ExecutionQueueItem
