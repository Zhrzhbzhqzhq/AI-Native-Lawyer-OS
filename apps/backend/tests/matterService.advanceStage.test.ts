import { describe, it, expect, vi } from 'vitest'
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
        // stub bootstrap to emulate 3 created tasks
        svc.bootstrapStageTasks = async (id: string, stage: any) => ({ created: [1, 2, 3], skipped: [] })
        const out = await svc.advanceMatterStage('m-2', 'TASK_COMPLETED')
        // After migration, should persist stage only and bootstrap tasks
        expect(out.persisted).toBe(true)
        expect(spy.called).toBe(true)
        expect(spy.last.patch).toEqual({ stage: 'evidence_collection' })
        expect(out.bootstrap).toBeDefined()
        expect(out.bootstrap.created.length).toBe(3)
    })

    it('does not call bootstrap when shouldAdvance is false', async () => {
        const matter = { matter_id: 'm-b1', status: 'intake' }
        const tasks = [{ status: 'waiting_lawyer' }]
        const spy = { called: false as boolean }
        const svc = makeServiceMock(matter, tasks, spy)
        // replace bootstrap with spy that would throw if called
        svc.bootstrapStageTasks = async () => { throw new Error('should not be called') }
        const out = await svc.advanceMatterStage('m-b1', 'UPLOAD_COMPLETED')
        expect(out.persisted).toBe(false)
        expect(spy.called).toBe(false)
    })

    it('creates none when all evidence tasks already exist', async () => {
        const matter = { matter_id: 'm-b2', status: 'intake' }
        const tasks = [{ status: 'finalized' }]
        const spy = { called: false as boolean, last: null }
        const svc = makeServiceMock(matter, tasks, spy)
        svc.bootstrapStageTasks = async () => ({ created: [], skipped: ['证据整理', '事实整理', '证明体系'] })
        const out = await svc.advanceMatterStage('m-b2', 'TASK_COMPLETED')
        expect(out.persisted).toBe(true)
        expect(out.bootstrap.created.length).toBe(0)
        expect(out.bootstrap.skipped.length).toBe(3)
    })

    it('does not call bootstrap when stage update fails', async () => {
        const matter = { matter_id: 'm-b3', status: 'intake' }
        const tasks = [{ status: 'finalized' }]
        const svc: any = new (MatterService as any)({} as any)
        // repo throws on update
        svc.repo = {
            findByMatterId: async (id: string) => matter,
            prisma: { task: { findMany: async () => tasks } },
            updateByMatterId: async () => { throw new Error('db failure') }
        }
        // bootstrap should not be called; leave default (would error if called)
        const out = await svc.advanceMatterStage('m-b3', 'TASK_COMPLETED')
        expect(out.persisted).toBe(false)
        expect(out.reason).toBe('matter_stage_update_failed')
    })

    it('throws when bootstrap fails after stage persisted', async () => {
        const matter = { matter_id: 'm-b4', status: 'intake' }
        const tasks = [{ status: 'finalized' }]
        const spy = { called: false as boolean, last: null }
        const svc = makeServiceMock(matter, tasks, spy)
        // make bootstrap throw after update
        svc.bootstrapStageTasks = async () => { throw new Error('bootstrap failed') }
        await expect(svc.advanceMatterStage('m-b4', 'TASK_COMPLETED')).rejects.toThrow(/matter_stage_persisted_but_task_bootstrap_failed/)
        expect(spy.called).toBe(true)
    })

    it('does not update when nextStage equals currentStage', async () => {
        const matter = { matter_id: 'm-3', status: 'intake' }
        const tasks = [{ status: 'finalized' }]
        const spy = { called: false as boolean }
        const svc = makeServiceMock(matter, tasks, spy)

        // force engine to return same stage via spy
        const s = vi.spyOn(matterEngine as any, 'handleEvent').mockReturnValue(stages.INTAKE)
        const out = await svc.advanceMatterStage('m-3', 'TASK_COMPLETED')
        expect(out.persisted).toBe(false)
        expect(spy.called).toBe(false)
        s.mockRestore()
    })

    it('does not persist EXECUTION stage and returns reason', async () => {
        const matter = { matter_id: 'm-4', status: 'litigation' }
        const tasks: any[] = [{ status: 'finalized' }]
        const spy = { called: false as boolean }
        const svc = makeServiceMock(matter, tasks, spy)

        // force engine to return EXECUTION via spy
        const s = vi.spyOn(matterEngine as any, 'handleEvent').mockReturnValue(stages.EXECUTION)
        const out = await svc.advanceMatterStage('m-4', 'TASK_COMPLETED')
        expect(out.persisted).toBe(false)
        expect(out.reason).toMatch(/execution/)
        expect(spy.called).toBe(false)
        s.mockRestore()
    })
})
