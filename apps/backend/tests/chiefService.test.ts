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

    it('maps statuses to nextAction and reason with safe fallback', async () => {
        const matters = [{ matter_id: 'm1' }]
        const tasksByMatter: any = {
            m1: [
                { task_id: 'tw', status: 'waiting_lawyer', priority: 'normal' },
                { task_id: 'tr', status: 'ready_to_start', priority: 'normal' },
                { task_id: 'tm', status: 'waiting_materials', priority: 'normal' },
                { task_id: 'tc', status: 'completed', priority: 'normal' },
                { task_id: 'tu', status: 'some_unknown_status', priority: 'normal' },
            ],
        }

        const svc = makeServiceWithMocks(matters, tasksByMatter)
        const out = await svc.generateTodayRuntime()

        const all = [...out.risks, ...out.review, ...out.ready, ...out.handle, ...out.completed]

        const find = (id: string) => all.find((t: any) => t.task_id === id)

        const a_tw = find('tw')
        expect(a_tw).toBeTruthy()
        expect(a_tw.nextAction).toBe('审核工作成果')

        const a_tr = find('tr')
        expect(a_tr).toBeTruthy()
        expect(a_tr.nextAction).toBe('同意开始')

        const a_tm = find('tm')
        expect(a_tm).toBeTruthy()
        expect(a_tm.nextAction).toBe('补充资料')

        const a_tc = find('tc')
        expect(a_tc).toBeTruthy()
        expect(a_tc.nextAction).toBe('查看成果')

        const a_tu = find('tu')
        expect(a_tu).toBeTruthy()
        expect(a_tu.nextAction).toBe('进入案件')
    })
})
