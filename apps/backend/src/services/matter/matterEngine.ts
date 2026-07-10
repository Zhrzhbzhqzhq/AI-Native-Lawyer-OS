import type { MatterStage } from './matterStage'
import * as Events from './matterEvents'
import * as Stages from './matterStage'

// Minimal in-memory skeleton for Matter Engine V1.
// All functions are synchronous, no DB/IO, no AI, no logging.

export function getCurrentStage(matter_id: string, override?: MatterStage): MatterStage {
    // V1: stateless skeleton — return override if provided, otherwise default to INTAKE
    return override || Stages.INTAKE
}

export function createStageTasks(stage: MatterStage): string[] {
    switch (stage) {
        case Stages.INTAKE:
            return ['咨询资料整理']
        case Stages.EVIDENCE:
            return ['证据整理', '事实整理', '证明体系']
        default:
            return []
    }
}

export function shouldAdvanceStage(currentStage: MatterStage, taskStatuses: string[]): boolean {
    // V1 rule: advance only if all provided taskStatuses are 'finalized' or 'completed'
    if (!taskStatuses || taskStatuses.length === 0) return false
    return taskStatuses.every(s => s === 'finalized' || s === 'completed')
}

export function handleEvent(currentStage: MatterStage, eventType: string): MatterStage {
    // V1 handling per requirements
    if (eventType === Events.UPLOAD_COMPLETED) {
        // keep Intake for V1
        return Stages.INTAKE
    }

    if (eventType === Events.TASK_COMPLETED) {
        // if currently INTAKE, determine transition to EVIDENCE only
        if (currentStage === Stages.INTAKE) return Stages.EVIDENCE
        // otherwise remain in current stage
        return currentStage
    }

    // Other events return current stage unchanged
    return currentStage
}

export default {
    getCurrentStage,
    createStageTasks,
    shouldAdvanceStage,
    handleEvent,
}
