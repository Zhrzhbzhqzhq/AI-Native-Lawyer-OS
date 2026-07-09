export type TaskState =
    | 'waiting_materials'
    | 'ready_to_start'
    | 'ai_working'
    | 'waiting_lawyer'
    | 'revision_requested'
    | 'ai_revising'
    | 'approved'
    | 'finalized'
    | 'completed'

export type TaskEvent =
    | 'UPLOAD_COMPLETED'
    | 'START'
    | 'AI_FINISHED'
    | 'LAWYER_APPROVED'
    | 'LAWYER_REVISION'
    | 'MATERIAL_ADDED'
    | 'FINALIZED'
    | 'COMPLETE'

// Compute next state given current state and event. Throws Error if illegal.
export function computeNextState(current: TaskState, event: TaskEvent): TaskState {
    // define transitions
    const map: Record<TaskState, Partial<Record<TaskEvent, TaskState>>> = {
        waiting_materials: {
            UPLOAD_COMPLETED: 'ready_to_start',
            MATERIAL_ADDED: 'ready_to_start',
        },
        ready_to_start: {
            START: 'ai_working',
            MATERIAL_ADDED: 'ready_to_start',
        },
        ai_working: {
            AI_FINISHED: 'waiting_lawyer',
            LAWYER_REVISION: 'revision_requested',
        },
        waiting_lawyer: {
            LAWYER_APPROVED: 'approved',
            LAWYER_REVISION: 'revision_requested',
            MATERIAL_ADDED: 'ready_to_start',
            START: 'ai_working',
        },
        revision_requested: {
            START: 'ai_revising',
        },
        ai_revising: {
            AI_FINISHED: 'waiting_lawyer',
        },
        approved: {
            FINALIZED: 'finalized',
        },
        finalized: {
            COMPLETE: 'completed',
        },
        completed: {},
    }

    const allowed = map[current]
    const next = allowed ? allowed[event] : undefined
    if (!next) throw new Error(`illegal transition: ${current} -> ${event}`)
    return next
}

export default { computeNextState }
