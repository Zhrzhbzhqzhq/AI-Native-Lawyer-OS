import { describe, it, expect } from 'vitest'
import MatterService from '../src/services/matterService'
import * as stages from '../src/services/matter/matterStage'
import * as matterEngine from '../src/services/matter/matterEngine'

function makeServiceMock(matter: any, tasks: any[], updateSpy?: { called: boolean; last?: any }) {
    const svc: any = new (MatterService as any)({} as any)
    svc.repo = {
        findByMatterId: async (id: string) => matter,
        prisma: {
            task: {
                findMany: async (opts: any) => tasks,
            },
        },
        updateByMatterId: async (id: string, patch: any) => {
            if (updateSpy) { updateSpy.called = true; updateSpy.last = { id, patch } }
            return { ...matter, ...patch }
        }
    }
    return svc as unknown as InstanceType<typeof MatterService>
}

describe('MatterService.advanceMatterStage', () => {
    it('does not call update when shouldAdvance is false', async () => {
        const matter = { matter_id: 'm-1', status: 'intake' }
        const tasks = [{ status: 'waiting_lawyer' }]
        const spy = { called: false as boolean }
        const svc = makeServiceMock(matter, tasks, spy)
        const out = await svc.advanceMatterStage('m-1', 'UPLOAD_COMPLETED')
        expect(out.persisted).toBe(false)
        expect(spy.called).toBe(false)
    })

    it('updates intake -> evidence_collection when shouldAdvance true', async () => {
        const matter = { matter_id: 'm-2', status: 'intake' }
        const tasks = [{ status: 'finalized' }]
        const spy = { called: false as boolean, last: null }
        const svc = makeServiceMock(matter, tasks, spy)
        const out = await svc.advanceMatterStage('m-2', 'TASK_COMPLETED')
        expect(out.persisted).toBe(true)
        expect(spy.called).toBe(true)
        expect(spy.last.patch).toEqual({ status: 'evidence_collection' })
    })

    it('does not update when nextStage equals currentStage', async () => {
        const matter = { matter_id: 'm-3', status: 'intake' }
        const tasks = [{ status: 'finalized' }]
        const spy = { called: false as boolean }
        const svc = makeServiceMock(matter, tasks, spy)

        // force engine to return same stage
        const orig = matterEngine.handleEvent
            ; (matterEngine as any).handleEvent = () => stages.INTAKE
        const out = await svc.advanceMatterStage('m-3', 'TASK_COMPLETED')
        expect(out.persisted).toBe(false)
        expect(spy.called).toBe(false)
            ; (matterEngine as any).handleEvent = orig
    })

    it('does not persist EXECUTION stage and returns reason', async () => {
        const matter = { matter_id: 'm-4', status: 'litigation' }
        const tasks: any[] = [{ status: 'finalized' }]
        const spy = { called: false as boolean }
        const svc = makeServiceMock(matter, tasks, spy)

        // force engine to return EXECUTION
        const orig = matterEngine.handleEvent
            ; (matterEngine as any).handleEvent = () => stages.EXECUTION
        const out = await svc.advanceMatterStage('m-4', 'TASK_COMPLETED')
        expect(out.persisted).toBe(false)
        expect(out.reason).toMatch(/execution/)
        expect(spy.called).toBe(false)
            ; (matterEngine as any).handleEvent = orig
    })
})
