import { describe, it, expect } from 'vitest'
import ChiefService from '../src/services/chiefService'

// create service with fake prisma by injecting repos via prisma shape
function makeServiceWithMocks(matters: any[], tasksByMatter: Record<string, any[]>) {
    const svc: any = new (ChiefService as any)({} as any)
    svc.matterRepo = {
        findAll: async () => matters,
    }
    svc.taskRepo = {
        findByMatterId: async (matter_id: string) => tasksByMatter[matter_id] || [],
    }
    return svc as unknown as InstanceType<typeof ChiefService>
}

describe('ChiefService.generateTodayRuntime', () => {
    it('groups tasks into risks, review, ready, handle, completed with fixed order', async () => {
        const matters = [{ matter_id: 'm1' }, { matter_id: 'm2' }]
        const tasksByMatter: any = {
            m1: [
                { task_id: 't1', status: 'open', priority: 'normal' },
                { task_id: 't2', status: 'waiting_review', priority: 'normal' },
                { task_id: 't3', status: 'completed', priority: 'normal' },
            ],
            m2: [
                { task_id: 't4', status: 'in_progress', priority: 'normal' },
                { task_id: 't5', status: 'open', priority: 'high' },
            ],
        }

        const svc = makeServiceWithMocks(matters, tasksByMatter)
        const out = await svc.generateTodayRuntime()

        // Check buckets exist
        expect(Array.isArray(out.risks)).toBe(true)
        expect(Array.isArray(out.review)).toBe(true)
        expect(Array.isArray(out.ready)).toBe(true)
        expect(Array.isArray(out.handle)).toBe(true)
        expect(Array.isArray(out.completed)).toBe(true)

        // high priority task should be in risks
        expect(out.risks.find((t: any) => t.task_id === 't5')).toBeTruthy()
        // waiting_review -> review
        expect(out.review.find((t: any) => t.task_id === 't2')).toBeTruthy()
        // open (m1 t1) -> ready
        expect(out.ready.find((t: any) => t.task_id === 't1')).toBeTruthy()
        // in_progress -> handle
        expect(out.handle.find((t: any) => t.task_id === 't4')).toBeTruthy()
        // completed -> completed
        expect(out.completed.find((t: any) => t.task_id === 't3')).toBeTruthy()
    })
})
