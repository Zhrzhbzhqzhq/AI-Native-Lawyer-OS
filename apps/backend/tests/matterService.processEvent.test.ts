import { describe, it, expect } from 'vitest'
import MatterService from '../src/services/matterService'

// create a MatterService with a fake prisma by injecting into repo
function makeServiceWithMocks(matter: any | null, tasks: any[]) {
    const svc: any = new (MatterService as any)({} as any)
    const updateSpy = { called: false }
    svc.repo = {
        findByMatterId: async (id: string) => matter,
        updateByMatterId: async () => { updateSpy.called = true; throw new Error('should not write in processMatterEvent') },
        prisma: {
            task: {
                findMany: async (opts: any) => tasks,
            },
        },
    }
    svc.__updateSpy = updateSpy
    return svc as unknown as InstanceType<typeof MatterService>
}

describe('MatterService.processMatterEvent', () => {
    it('throws when matter not found', async () => {
        const svc = makeServiceWithMocks(null, [])
        await expect(svc.processMatterEvent('missing', 'UPLOAD_COMPLETED')).rejects.toThrow(/not found/)
    })

    it('handles UPLOAD_COMPLETED and stays in INTAKE', async () => {
        const matter = { matter_id: 'm-1', status: 'intake', stage: null }
        const svc = makeServiceWithMocks(matter, [])
        const out = await svc.processMatterEvent('m-1', 'UPLOAD_COMPLETED')
        expect(out.currentStage).toBe('INTAKE')
        expect(out.nextStage).toBe('INTAKE')
        expect(out.shouldAdvance).toBe(false)
        expect(Array.isArray(out.stageTasks)).toBe(true)
        expect((svc as any).__updateSpy.called).toBe(false)
    })

    it('respects persisted stage: evidence_collection -> EVIDENCE', async () => {
        const matter = { matter_id: 'm-4', status: 'active', stage: 'evidence_collection' }
        const svc = makeServiceWithMocks(matter, [])
        const out = await svc.processMatterEvent('m-4', 'UPLOAD_COMPLETED')
        expect(out.currentStage).toBe('EVIDENCE')
        expect((svc as any).__updateSpy.called).toBe(false)
    })

    it('respects persisted stage: drafting -> DOCUMENTS', async () => {
        const matter = { matter_id: 'm-5', status: 'active', stage: 'drafting' }
        const svc = makeServiceWithMocks(matter, [])
        const out = await svc.processMatterEvent('m-5', 'UPLOAD_COMPLETED')
        expect(out.currentStage).toBe('DOCUMENTS')
        expect((svc as any).__updateSpy.called).toBe(false)
    })

    it('falls back to INTAKE when stage is null and status is active', async () => {
        const matter = { matter_id: 'm-6', status: 'active', stage: null }
        const svc = makeServiceWithMocks(matter, [])
        const out = await svc.processMatterEvent('m-6', 'UPLOAD_COMPLETED')
        expect(out.currentStage).toBe('INTAKE')
        expect((svc as any).__updateSpy.called).toBe(false)
    })

    it('unknown persisted stage -> INTAKE', async () => {
        const matter = { matter_id: 'm-7', status: 'active', stage: 'mystery_stage' }
        const svc = makeServiceWithMocks(matter, [])
        const out = await svc.processMatterEvent('m-7', 'UPLOAD_COMPLETED')
        expect(out.currentStage).toBe('INTAKE')
        expect((svc as any).__updateSpy.called).toBe(false)
    })

    it('persisted stage closed -> CLOSED', async () => {
        const matter = { matter_id: 'm-8', status: 'active', stage: 'closed' }
        const svc = makeServiceWithMocks(matter, [])
        const out = await svc.processMatterEvent('m-8', 'UPLOAD_COMPLETED')
        expect(out.currentStage).toBe('CLOSED')
        expect((svc as any).__updateSpy.called).toBe(false)
    })

    it('handles TASK_COMPLETED and returns shouldAdvance true when all tasks done', async () => {
        const matter = { matter_id: 'm-2', status: 'intake' }
        const tasks = [{ status: 'finalized' }, { status: 'completed' }]
        const svc = makeServiceWithMocks(matter, tasks)
        const out = await svc.processMatterEvent('m-2', 'TASK_COMPLETED')
        expect(out.currentStage).toBe('INTAKE')
        expect(out.nextStage).toBe('EVIDENCE')
        expect(out.shouldAdvance).toBe(true)
        expect(out.stageTasks).toContain('证据整理')
    })

    it('handles TASK_COMPLETED and returns shouldAdvance false when tasks incomplete', async () => {
        const matter = { matter_id: 'm-3', status: 'intake' }
        const tasks = [{ status: 'finalized' }, { status: 'waiting_lawyer' }]
        const svc = makeServiceWithMocks(matter, tasks)
        const out = await svc.processMatterEvent('m-3', 'TASK_COMPLETED')
        expect(out.currentStage).toBe('INTAKE')
        expect(out.nextStage).toBe('EVIDENCE')
        expect(out.shouldAdvance).toBe(false)
    })
})
