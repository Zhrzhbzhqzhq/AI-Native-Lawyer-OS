import { describe, it, expect } from 'vitest'
import MatterService from '../src/services/matterService'

function makeServiceMock(matter: any, existingTasks: any[], createSpy?: { called: boolean; created?: any[] }) {
    const svc: any = new (MatterService as any)({} as any)
    svc.repo = {
        findByMatterId: async (id: string) => matter,
        prisma: {
            task: {
                findMany: async (opts: any) => existingTasks,
                create: async (data: any) => {
                    if (createSpy) { createSpy.called = true; createSpy.created = createSpy.created || []; createSpy.created.push(data.data) }
                    return { ...data.data }
                }
            }
        }
    }
    return svc as unknown as InstanceType<typeof MatterService>
}

describe('MatterService.bootstrapStageTasks', () => {
    it('creates 3 tasks for EVIDENCE when none exist', async () => {
        const matter = { matter_id: 'm-e1', status: 'intake' }
        const spy: any = { called: false }
        const svc = makeServiceMock(matter, [], spy)
        const out = await svc.bootstrapStageTasks('m-e1', 'EVIDENCE')
        expect(Array.isArray(out.created)).toBe(true)
        expect(out.created.length).toBe(3)
        expect(out.skipped.length).toBe(0)
    })

    it('creates remaining tasks when some exist', async () => {
        const matter = { matter_id: 'm-e2', status: 'intake' }
        const existing = [{ title: '证据整理' }]
        const spy: any = { called: false }
        const svc = makeServiceMock(matter, existing, spy)
        const out = await svc.bootstrapStageTasks('m-e2', 'EVIDENCE')
        expect(out.created.length).toBe(2)
        expect(out.skipped).toContain('证据整理')
    })

    it('creates none when all exist', async () => {
        const matter = { matter_id: 'm-e3', status: 'intake' }
        const existing = [{ title: '证据整理' }, { title: '事实整理' }, { title: '证明体系' }]
        const spy: any = { called: false }
        const svc = makeServiceMock(matter, existing, spy)
        const out = await svc.bootstrapStageTasks('m-e3', 'EVIDENCE')
        expect(out.created.length).toBe(0)
        expect(out.skipped.length).toBe(3)
    })

    it('returns empty for unsupported stage', async () => {
        const matter = { matter_id: 'm-x1', status: 'intake' }
        const svc = makeServiceMock(matter, [])
        const out = await svc.bootstrapStageTasks('m-x1', 'DOCUMENTS')
        expect(out.created.length).toBe(0)
        expect(out.skipped.length).toBe(0)
    })
})
