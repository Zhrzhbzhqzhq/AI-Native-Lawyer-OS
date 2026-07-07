import { JSONObject } from './index'

export interface TodayQueueItem {
    id: string
    title?: string
    matter_id?: string
    priority?: number
    due_at?: string | null
    created_at?: string
    updated_at?: string
    metadata?: JSONObject
    [key: string]: unknown
}

export interface ExecutionQueueItem {
    id: string
    queue_id?: string
    action_type?: string
    action_payload?: JSONObject
    status?: string
    created_at?: string
    executed_at?: string | null
    // allow backend fields in snake_case
    [key: string]: unknown
}
