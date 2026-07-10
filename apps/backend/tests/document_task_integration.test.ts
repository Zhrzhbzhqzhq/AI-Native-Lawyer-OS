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
    await prisma.document.deleteMany({ where: { knowledge_id: { startsWith: `r-` } } }).catch(() => { })
    await prisma.material.deleteMany({ where: { material_id: { startsWith: `mat-${testMatterId}` } } }).catch(() => { })
    await prisma.matter.deleteMany({ where: { matter_id: testMatterId } }).catch(() => { })
    await app.close()
    await prisma.$disconnect()
})

describe('document -> task transition', () => {
    it('ai_working -> waiting_lawyer on ai finished', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-1`, matter_id: testMatterId, title: '法律文书', description: '自动测试任务', priority: 'normal', status: 'ai_working' } })

        const res = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/documents`, payload: { title: `D1-${RUN_ID}`, document_type: 'memo', status: 'ai_finished' } })
        expect(res.statusCode).toBe(201)
        const body = JSON.parse(res.body)
        expect(body).toHaveProperty('task_transitioned', true)
        expect(body.task_status).toBe('waiting_lawyer')

        const updated = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(updated?.status).toBe('waiting_lawyer')
    })

    it('ai_revising -> waiting_lawyer on ai finished', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-2`, matter_id: testMatterId, title: '法律文书', description: 'ai revising', priority: 'normal', status: 'ai_revising' } })

        const res = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/documents`, payload: { title: `D2-${RUN_ID}`, document_type: 'memo', status: 'ai_finished' } })
        expect(res.statusCode).toBe(201)
        const body = JSON.parse(res.body)
        expect(body.task_transitioned).toBe(true)
        expect(body.task_status).toBe('waiting_lawyer')

        const updated = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(updated?.status).toBe('waiting_lawyer')
    })

    it('waiting_lawyer -> approved on lawyer review', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-3`, matter_id: testMatterId, title: '法律文书', description: 'waiting for lawyer', priority: 'normal', status: 'waiting_lawyer' } })

        const res = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/documents`, payload: { title: `D3-${RUN_ID}`, document_type: 'memo', review: 'approved' } })
        expect(res.statusCode).toBe(201)
        const body = JSON.parse(res.body)
        expect(body.task_transitioned).toBe(true)
        expect(body.task_status).toBe('approved')

        const updated = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(updated?.status).toBe('approved')
    })

    it('waiting_lawyer -> revision_requested on lawyer review', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-4`, matter_id: testMatterId, title: '法律文书', description: 'waiting for lawyer', priority: 'normal', status: 'waiting_lawyer' } })

        const res = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/documents`, payload: { title: `D4-${RUN_ID}`, document_type: 'memo', review: 'revision' } })
        expect(res.statusCode).toBe(201)
        const body = JSON.parse(res.body)
        expect(body.task_transitioned).toBe(true)
        expect(body.task_status).toBe('revision_requested')

        const updated = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(updated?.status).toBe('revision_requested')
    })

    it('does nothing when task missing', async () => {
        await prisma.task.deleteMany({ where: { matter_id: testMatterId, title: '法律文书' } }).catch(() => { })
        const res = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/documents`, payload: { title: `D5-${RUN_ID}`, document_type: 'memo', review: 'approved' } })
        expect(res.statusCode).toBe(201)
        const body = JSON.parse(res.body)
        expect(body.task_transitioned).toBe(false)
    })

    it('does not transition when task finalized or completed', async () => {
        const taskF = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-6`, matter_id: testMatterId, title: '法律文书', description: 'finalized', priority: 'normal', status: 'finalized' } })
        const resF = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/documents`, payload: { title: `D6-${RUN_ID}`, document_type: 'memo', review: 'approved' } })
        expect(resF.statusCode).toBe(201)
        const bodyF = JSON.parse(resF.body)
        expect(bodyF.task_transitioned).toBe(false)
        const unchangedF = await prisma.task.findUnique({ where: { task_id: taskF.task_id } })
        expect(unchangedF?.status).toBe('finalized')

        const taskC2 = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-8`, matter_id: testMatterId, title: '法律文书', description: 'completed', priority: 'normal', status: 'completed' } })
        const resC = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/documents`, payload: { title: `D7-${RUN_ID}`, document_type: 'memo', review: 'approved' } })
        expect(resC.statusCode).toBe(201)
        const bodyC = JSON.parse(resC.body)
        expect(bodyC.task_transitioned).toBe(false)
        const unchangedC = await prisma.task.findUnique({ where: { task_id: taskC2.task_id } })
        expect(unchangedC?.status).toBe('completed')
    })

    it('illegal transition returns 400', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-9`, matter_id: testMatterId, title: '法律文书', description: 'ready', priority: 'normal', status: 'ready_to_start' } })
        const res = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/documents`, payload: { title: `D8-${RUN_ID}`, document_type: 'memo', review: 'approved' } })
        expect(res.statusCode).toBe(400)
        const body = JSON.parse(res.body)
        expect(body.error).toBe('invalid_task_transition')

        const unchanged = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(unchanged?.status).toBe('ready_to_start')
    })

    it('document create failure does not change task', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-10`, matter_id: testMatterId, title: '法律文书', description: 'will not change', priority: 'normal', status: 'waiting_lawyer' } })
        // call with missing title -> should return 400 and not change task
        const res = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/documents`, payload: { document_type: 'memo' } })
        expect(res.statusCode).toBe(400)
        const unchanged = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(unchanged?.status).toBe('waiting_lawyer')
    })

    it('review-only approved -> 200 and task approved', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-11`, matter_id: testMatterId, title: '法律文书', description: 'waiting for lawyer', priority: 'normal', status: 'waiting_lawyer' } })
        // create document
        const created = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/documents`, payload: { title: `DR-${RUN_ID}`, document_type: 'memo', status: 'draft', content: 'verify' } })
        expect(created.statusCode).toBe(201)
        const body = JSON.parse(created.body)
        const docId = body.created?.document_id || body.created?.id

        const res = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/documents/${docId}`, payload: { review: 'approved' } })
        expect(res.statusCode).toBe(200)
        const resp = JSON.parse(res.body)
        expect(resp.task_transitioned).toBe(true)
        expect(resp.task_status).toBe('approved')

        const updated = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(updated?.status).toBe('approved')
    })

    it('review-only revision -> 200 and task revision_requested', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-12`, matter_id: testMatterId, title: '法律文书', description: 'waiting for lawyer', priority: 'normal', status: 'waiting_lawyer' } })
        const created = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/documents`, payload: { title: `DR2-${RUN_ID}`, document_type: 'memo', status: 'draft', content: 'verify' } })
        expect(created.statusCode).toBe(201)
        const body = JSON.parse(created.body)
        const docId = body.created?.document_id || body.created?.id

        const res = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/documents/${docId}`, payload: { review: 'revision' } })
        expect(res.statusCode).toBe(200)
        const resp = JSON.parse(res.body)
        expect(resp.task_transitioned).toBe(true)
        expect(resp.task_status).toBe('revision_requested')

        const updated = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(updated?.status).toBe('revision_requested')
    })

    it('empty body -> 400 nothing to update', async () => {
        const created = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/documents`, payload: { title: `DR3-${RUN_ID}`, document_type: 'memo', status: 'draft', content: 'verify' } })
        expect(created.statusCode).toBe(201)
        const body = JSON.parse(created.body)
        const docId = body.created?.document_id || body.created?.id

        const res = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/documents/${docId}`, payload: {} })
        expect(res.statusCode).toBe(400)
        const resp = JSON.parse(res.body)
        expect(resp.error).toBe('nothing to update')
    })

    it('illegal review -> 400', async () => {
        const created = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/documents`, payload: { title: `DR4-${RUN_ID}`, document_type: 'memo', status: 'draft', content: 'verify' } })
        expect(created.statusCode).toBe(201)
        const body = JSON.parse(created.body)
        const docId = body.created?.document_id || body.created?.id

        const res = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/documents/${docId}`, payload: { review: 'invalid_value' } })
        expect(res.statusCode).toBe(400)
        const resp = JSON.parse(res.body)
        expect(resp.error).toBe('invalid_review')
    })

    it('does not transition when task finalized or completed (patch review-only)', async () => {
        const taskF = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-13`, matter_id: testMatterId, title: '法律文书', description: 'finalized', priority: 'normal', status: 'finalized' } })
        const createdF = await app.inject({ method: 'POST', url: `/matters/${testMatterId}/documents`, payload: { title: `DRF-${RUN_ID}`, document_type: 'memo', status: 'draft', content: 'verify' } })
        expect(createdF.statusCode).toBe(201)
        const bodyF = JSON.parse(createdF.body)
        const docIdF = bodyF.created?.document_id || bodyF.created?.id

        const resF = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/documents/${docIdF}`, payload: { review: 'approved' } })
        expect(resF.statusCode).toBe(200)
        const respF = JSON.parse(resF.body)
        expect(respF.task_transitioned).toBe(false)
        const unchangedF = await prisma.task.findUnique({ where: { task_id: taskF.task_id } })
        expect(unchangedF?.status).toBe('finalized')
    })
})

export { }
