import { Matter } from './matter'
import { RuntimeSnapshot } from './runtime'

export interface WorkspaceSummary {
    matter_id: string
    title?: string
    matter?: Matter
    runtime?: RuntimeSnapshot
    counts?: {
        documents?: number
        evidence?: number
        tasks?: number
        [key: string]: number | undefined
    }
    last_activity?: string
    [key: string]: unknown
}
