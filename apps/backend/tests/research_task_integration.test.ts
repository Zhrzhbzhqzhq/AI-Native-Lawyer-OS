import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { buildApp } from '../src/server'
import { createPrismaClient } from '@lawdesk/database'

let app: any
let prisma: any
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
let testMatterId: string

beforeAll(async () => {
    app = await buildApp()
    await app.listen({ port: 0 })
    prisma = createPrismaClient()
    testMatterId = `test-m-${RUN_ID}`
    await prisma.matter.create({ data: { matter_id: testMatterId, title: 'Test Matter', description: '', matter_type: 'test', status: 'active' } })
    await prisma.material.create({ data: { material_id: `mat-${testMatterId}`, matter_id: testMatterId, title: 'Test Material', material_type: 'generic', source: '', storage_uri: '', status: 'active' } })
})

afterAll(async () => {
    // cleanup created records
    await prisma.task.deleteMany({ where: { task_id: { startsWith: `t-` } } }).catch(() => { })
    await prisma.material.deleteMany({ where: { material_id: { startsWith: `mat-${testMatterId}` } } }).catch(() => { })
    await prisma.matter.deleteMany({ where: { matter_id: testMatterId } }).catch(() => { })
    await app.close()
    await prisma.$disconnect()
})

describe('research -> task transition', () => {
    it('ai_working -> waiting_lawyer on ai finished', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-1`, matter_id: testMatterId, title: '法律检索', description: '自动测试任务', priority: 'normal', status: 'ai_working' } })

        const res = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/research`, payload: { research_id: `r-${RUN_ID}-1`, title: 'R1', status: 'ai_finished' } })
        expect(res.statusCode).toBe(201)
        const body = JSON.parse(res.body)
        expect(body).toHaveProperty('task_transitioned', true)
        expect(body.task_status).toBe('waiting_lawyer')

        const updated = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(updated?.status).toBe('waiting_lawyer')
    })

    it('ai_revising -> waiting_lawyer on ai finished', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-2`, matter_id: testMatterId, title: '法律检索', description: 'ai revising', priority: 'normal', status: 'ai_revising' } })

        const res = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/research`, payload: { research_id: `r-${RUN_ID}-2`, title: 'R2', status: 'ai_finished' } })
        expect(res.statusCode).toBe(201)
        const body = JSON.parse(res.body)
        expect(body.task_transitioned).toBe(true)
        expect(body.task_status).toBe('waiting_lawyer')

        const updated = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(updated?.status).toBe('waiting_lawyer')
    })

    it('waiting_lawyer -> approved on lawyer review', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-3`, matter_id: testMatterId, title: '法律检索', description: 'waiting for lawyer', priority: 'normal', status: 'waiting_lawyer' } })

        const res = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/research`, payload: { research_id: `r-${RUN_ID}-3`, title: 'R3', review: 'approved' } })
        expect(res.statusCode).toBe(201)
        const body = JSON.parse(res.body)
        expect(body.task_transitioned).toBe(true)
        expect(body.task_status).toBe('approved')

        const updated = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(updated?.status).toBe('approved')
    })

    it('waiting_lawyer -> revision_requested on lawyer review', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-4`, matter_id: testMatterId, title: '法律检索', description: 'waiting for lawyer', priority: 'normal', status: 'waiting_lawyer' } })

        const res = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/research`, payload: { research_id: `r-${RUN_ID}-4`, title: 'R4', review: 'revision' } })
        expect(res.statusCode).toBe(201)
        const body = JSON.parse(res.body)
        expect(body.task_transitioned).toBe(true)
        expect(body.task_status).toBe('revision_requested')

        const updated = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(updated?.status).toBe('revision_requested')
    })

    it('does nothing when task missing', async () => {
        await prisma.task.deleteMany({ where: { matter_id: testMatterId, title: '法律检索' } }).catch(() => { })
        const res = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/research`, payload: { research_id: `r-${RUN_ID}-5`, title: 'R5', review: 'approved' } })
        expect(res.statusCode).toBe(201)
        const body = JSON.parse(res.body)
        expect(body.task_transitioned).toBe(false)
    })

    it('does not transition when task finalized or completed', async () => {
        const taskF = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-6`, matter_id: testMatterId, title: '法律检索', description: 'finalized', priority: 'normal', status: 'finalized' } })
        const resF = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/research`, payload: { research_id: `r-${RUN_ID}-6`, title: 'R6', review: 'approved' } })
        expect(resF.statusCode).toBe(201)
        const bodyF = JSON.parse(resF.body)
        expect(bodyF.task_transitioned).toBe(false)
        const unchangedF = await prisma.task.findUnique({ where: { task_id: taskF.task_id } })
        expect(unchangedF?.status).toBe('finalized')

        const taskC = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-7`, matter_id: testMatterId, title: '法律檢索', description: 'completed', priority: 'normal', status: 'completed' } }).catch(() => null)
        // create with slightly different title to ensure not matched
        const taskC2 = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-8`, matter_id: testMatterId, title: '法律检索', description: 'completed', priority: 'normal', status: 'completed' } })
        const resC = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/research`, payload: { research_id: `r-${RUN_ID}-7`, title: 'R7', review: 'approved' } })
        expect(resC.statusCode).toBe(201)
        const bodyC = JSON.parse(resC.body)
        expect(bodyC.task_transitioned).toBe(false)
        const unchangedC = await prisma.task.findUnique({ where: { task_id: taskC2.task_id } })
        expect(unchangedC?.status).toBe('completed')
    })

    it('illegal transition returns 400', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-9`, matter_id: testMatterId, title: '法律检索', description: 'ready', priority: 'normal', status: 'ready_to_start' } })
        const res = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/research`, payload: { research_id: `r-${RUN_ID}-8`, title: 'R8', review: 'approved' } })
        expect(res.statusCode).toBe(400)
        const body = JSON.parse(res.body)
        expect(body.error).toBe('invalid_task_transition')

        const unchanged = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(unchanged?.status).toBe('ready_to_start')
    })

    it('research create failure does not change task', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-10`, matter_id: testMatterId, title: '法律检索', description: 'will not change', priority: 'normal', status: 'waiting_lawyer' } })
        // call with missing title -> should return 400 and not change task
        const res = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/research`, payload: { research_id: `r-nok-${RUN_ID}` } })
        expect(res.statusCode).toBe(400)
        const unchanged = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(unchanged?.status).toBe('waiting_lawyer')
    })
})

export { }
