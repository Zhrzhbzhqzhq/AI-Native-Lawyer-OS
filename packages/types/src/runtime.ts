import { JSONObject } from './index'

export interface RuntimeDecision {
    id: string
    matter_id?: string
    source?: string
    conclusion?: string
    confidence?: number
    // backend fields are snake_case where applicable
    created_at?: string
    updated_at?: string
    metadata?: JSONObject
    [key: string]: unknown
}

export interface RuntimeAction {
    id: string
    type?: string
    title?: string
    status?: string
    payload?: JSONObject
    created_at?: string
    executed_at?: string | null
    [key: string]: unknown
}

export interface RuntimePlan {
    id: string
    title?: string
    description?: string
    steps?: RuntimeAction[]
    created_at?: string
    updated_at?: string
    [key: string]: unknown
}

export interface RuntimeSnapshot {
    snapshot_id?: string
    matter_id?: string
    summary?: string
    decisions?: RuntimeDecision[]
    plans?: RuntimePlan[]
    actions?: RuntimeAction[]
    last_updated?: string
    // provider-specific raw data
    raw?: JSONObject
    [key: string]: unknown
}
