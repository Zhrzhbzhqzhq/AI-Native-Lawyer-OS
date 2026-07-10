import { describe, it, expect } from 'vitest'
import MatterService from '../src/services/matterService'

// create a MatterService with a fake prisma by injecting into repo
function makeServiceWithMocks(matter: any | null, tasks: any[]) {
    const svc: any = new (MatterService as any)({} as any)
    svc.repo = {
        findByMatterId: async (id: string) => matter,
        prisma: {
            task: {
                findMany: async (opts: any) => tasks,
            },
        },
    }
    return svc as unknown as InstanceType<typeof MatterService>
}

describe('MatterService.processMatterEvent', () => {
    it('throws when matter not found', async () => {
        const svc = makeServiceWithMocks(null, [])
        await expect(svc.processMatterEvent('missing', 'UPLOAD_COMPLETED')).rejects.toThrow(/not found/)
    })

    it('handles UPLOAD_COMPLETED and stays in INTAKE', async () => {
        const matter = { matter_id: 'm-1', status: 'intake' }
        const svc = makeServiceWithMocks(matter, [])
        const out = await svc.processMatterEvent('m-1', 'UPLOAD_COMPLETED')
        expect(out.currentStage).toBe('INTAKE')
        expect(out.nextStage).toBe('INTAKE')
        expect(out.shouldAdvance).toBe(false)
        expect(Array.isArray(out.stageTasks)).toBe(true)
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
