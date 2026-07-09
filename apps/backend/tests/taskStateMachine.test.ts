import { describe, it, expect } from 'vitest'
import { computeNextState } from '../src/services/taskStateMachine'

describe('task state machine', () => {
    it('transitions waiting_materials -> ready_to_start on UPLOAD_COMPLETED', () => {
        expect(computeNextState('waiting_materials', 'UPLOAD_COMPLETED')).toBe('ready_to_start')
    })

    it('transitions ready_to_start -> ai_working on START', () => {
        expect(computeNextState('ready_to_start', 'START')).toBe('ai_working')
    })

    it('transitions ai_working -> waiting_lawyer on AI_FINISHED', () => {
        expect(computeNextState('ai_working', 'AI_FINISHED')).toBe('waiting_lawyer')
    })

    it('throws on illegal transition', () => {
        expect(() => computeNextState('completed', 'START')).toThrow()
    })
})
