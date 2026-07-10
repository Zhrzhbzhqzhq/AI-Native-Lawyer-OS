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
    await prisma.evidence.deleteMany({ where: { evidence_id: { startsWith: `e-` } } }).catch(() => { })
    await prisma.material.deleteMany({ where: { material_id: { startsWith: `mat-${testMatterId}` } } }).catch(() => { })
    await prisma.matter.deleteMany({ where: { matter_id: testMatterId } }).catch(() => { })
    await app.close()
    await prisma.$disconnect()
})

describe('evidence -> task transition', () => {
    it('accepted evidence triggers task transition when task exists', async () => {
        // create task titled '证据整理' in ai_working state
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-1`, matter_id: testMatterId, title: '证据整理', description: '自动测试任务', priority: 'normal', status: 'ai_working' } })

        // create evidence
        const ev = await prisma.evidence.create({ data: { evidence_id: `e-${RUN_ID}-1`, matter_id: testMatterId, title: 'Ev1', evidence_type: 'photo', description: 'test', relevance: 'high', status: 'pending', material_id: `mat-${testMatterId}` } })

        const res = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/evidence/${ev.evidence_id}/status`, payload: { status: 'accepted' } })
        expect(res.statusCode).toBe(200)
        const body = JSON.parse(res.body)
        expect(body).toHaveProperty('task_transitioned', true)
        expect(body.task_status).toBe('waiting_lawyer')

        const updatedTask = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(updatedTask?.status).toBe('waiting_lawyer')
    })

    it('accepted evidence does nothing when task missing', async () => {
        const ev = await prisma.evidence.create({ data: { evidence_id: `e-${RUN_ID}-2`, matter_id: testMatterId, title: 'Ev2', evidence_type: 'photo', description: 'test', relevance: 'medium', status: 'pending', material_id: `mat-${testMatterId}` } })

        const res = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/evidence/${ev.evidence_id}/status`, payload: { status: 'accepted' } })
        expect(res.statusCode).toBe(200)
        const body = JSON.parse(res.body)
        expect(body.task_transitioned).toBe(false)
    })

    it('does not transition when task already in waiting_lawyer', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-3`, matter_id: testMatterId, title: '证据整理', description: 'already waiting', priority: 'normal', status: 'waiting_lawyer' } })
        const ev = await prisma.evidence.create({ data: { evidence_id: `e-${RUN_ID}-3`, matter_id: testMatterId, title: 'Ev3', evidence_type: 'photo', description: 'test', relevance: 'low', status: 'pending', material_id: `mat-${testMatterId}` } })

        const res = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/evidence/${ev.evidence_id}/status`, payload: { status: 'accepted' } })
        expect(res.statusCode).toBe(200)
        const body = JSON.parse(res.body)
        expect(body.task_transitioned).toBe(false)
    })

    it('ai_revising -> waiting_lawyer on accepted', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-4`, matter_id: testMatterId, title: '证据整理', description: 'ai revising', priority: 'normal', status: 'ai_revising' } })
        const ev = await prisma.evidence.create({ data: { evidence_id: `e-${RUN_ID}-4`, matter_id: testMatterId, title: 'Ev4', evidence_type: 'photo', description: 'test', relevance: 'high', status: 'pending', material_id: `mat-${testMatterId}` } })

        const res = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/evidence/${ev.evidence_id}/status`, payload: { status: 'accepted' } })
        expect(res.statusCode).toBe(200)
        const body = JSON.parse(res.body)
        expect(body.task_transitioned).toBe(true)
        expect(body.task_status).toBe('waiting_lawyer')

        const updated = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(updated?.status).toBe('waiting_lawyer')
    })

    it('returns 400 on illegal transition attempt', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-5`, matter_id: testMatterId, title: '证据整理', description: 'ready', priority: 'normal', status: 'ready_to_start' } })
        const ev = await prisma.evidence.create({ data: { evidence_id: `e-${RUN_ID}-5`, matter_id: testMatterId, title: 'Ev5', evidence_type: 'photo', description: 'test', relevance: 'low', status: 'pending', material_id: `mat-${testMatterId}` } })

        const res = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/evidence/${ev.evidence_id}/status`, payload: { status: 'accepted' } })
        expect(res.statusCode).toBe(400)
        const body = JSON.parse(res.body)
        expect(body.error).toBe('invalid_task_transition')

        const unchanged = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(unchanged?.status).toBe('ready_to_start')
    })

    it('evidence update failure does not change task', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-6`, matter_id: testMatterId, title: '证据整理', description: 'will not change', priority: 'normal', status: 'ai_working' } })
        // call with non-existent evidence id
        const res = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/evidence/nonexistent-${RUN_ID}/status`, payload: { status: 'accepted' } })
        // expect 404 from evidence update
        expect([400, 404]).toContain(res.statusCode)
        const unchanged = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(unchanged?.status).toBe('ai_working')
    })

    it('does not transition when task finalized or completed', async () => {
        const taskF = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-7`, matter_id: testMatterId, title: '证据整理', description: 'finalized', priority: 'normal', status: 'finalized' } })
        const evF = await prisma.evidence.create({ data: { evidence_id: `e-${RUN_ID}-7`, matter_id: testMatterId, title: 'Ev7', evidence_type: 'photo', description: 'test', relevance: 'low', status: 'pending', material_id: `mat-${testMatterId}` } })

        const resF = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/evidence/${evF.evidence_id}/status`, payload: { status: 'accepted' } })
        expect(resF.statusCode).toBe(200)
        const bodyF = JSON.parse(resF.body)
        expect(bodyF.task_transitioned).toBe(false)
        const unchangedF = await prisma.task.findUnique({ where: { task_id: taskF.task_id } })
        expect(unchangedF?.status).toBe('finalized')

        const taskC = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-8`, matter_id: testMatterId, title: '证据整理', description: 'completed', priority: 'normal', status: 'completed' } })
        const evC = await prisma.evidence.create({ data: { evidence_id: `e-${RUN_ID}-8`, matter_id: testMatterId, title: 'Ev8', evidence_type: 'photo', description: 'test', relevance: 'low', status: 'pending', material_id: `mat-${testMatterId}` } })

        const resC = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/evidence/${evC.evidence_id}/status`, payload: { status: 'accepted' } })
        expect(resC.statusCode).toBe(200)
        const bodyC = JSON.parse(resC.body)
        expect(bodyC.task_transitioned).toBe(false)
        const unchangedC = await prisma.task.findUnique({ where: { task_id: taskC.task_id } })
        expect(unchangedC?.status).toBe('completed')
    })

    it('waiting_lawyer -> approved on lawyer review', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-9`, matter_id: testMatterId, title: '证据整理', description: 'waiting for lawyer', priority: 'normal', status: 'waiting_lawyer' } })
        const ev = await prisma.evidence.create({ data: { evidence_id: `e-${RUN_ID}-9`, matter_id: testMatterId, title: 'Ev9', evidence_type: 'photo', description: 'to be reviewed', relevance: 'high', status: 'pending', material_id: `mat-${testMatterId}` } })

        const res = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/evidence/${ev.evidence_id}`, payload: { description: 'approved by lawyer', review: 'approved' } })
        expect(res.statusCode).toBe(200)
        const body = JSON.parse(res.body)
        expect(body.task_transitioned).toBe(true)
        expect(body.task_status).toBe('approved')

        const updated = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(updated?.status).toBe('approved')
    })

    it('waiting_lawyer -> revision_requested on lawyer review', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-10`, matter_id: testMatterId, title: '证据整理', description: 'waiting for lawyer', priority: 'normal', status: 'waiting_lawyer' } })
        const ev = await prisma.evidence.create({ data: { evidence_id: `e-${RUN_ID}-10`, matter_id: testMatterId, title: 'Ev10', evidence_type: 'photo', description: 'needs change', relevance: 'low', status: 'pending', material_id: `mat-${testMatterId}` } })

        const res = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/evidence/${ev.evidence_id}`, payload: { description: 'please revise', review: 'revision' } })
        expect(res.statusCode).toBe(200)
        const body = JSON.parse(res.body)
        expect(body.task_transitioned).toBe(true)
        expect(body.task_status).toBe('revision_requested')

        const updated = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(updated?.status).toBe('revision_requested')
    })

    it('lawyer review does nothing when task missing', async () => {
        // ensure no pre-existing '证据整理' task remains from previous tests
        await prisma.task.deleteMany({ where: { matter_id: testMatterId, title: '证据整理' } }).catch(() => { })
        const ev = await prisma.evidence.create({ data: { evidence_id: `e-${RUN_ID}-11`, matter_id: testMatterId, title: 'Ev11', evidence_type: 'photo', description: 'no task', relevance: 'low', status: 'pending', material_id: `mat-${testMatterId}` } })
        const res = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/evidence/${ev.evidence_id}`, payload: { description: 'approved', review: 'approved' } })
        expect(res.statusCode).toBe(200)
        const body = JSON.parse(res.body)
        expect(body.task_transitioned).toBe(false)
    })

    it('evidence review failure does not change task', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-12`, matter_id: testMatterId, title: '证据整理', description: 'unchanged on failure', priority: 'normal', status: 'waiting_lawyer' } })
        const res = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/evidence/nonexistent-review-${RUN_ID}`, payload: { description: 'approved', review: 'approved' } })
        expect([400, 404]).toContain(res.statusCode)
        const unchanged = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(unchanged?.status).toBe('waiting_lawyer')
    })

    it('does not transition on finalized/completed when lawyer reviews', async () => {
        const taskF = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-13`, matter_id: testMatterId, title: '证据整理', description: 'finalized', priority: 'normal', status: 'finalized' } })
        const evF = await prisma.evidence.create({ data: { evidence_id: `e-${RUN_ID}-13`, matter_id: testMatterId, title: 'Ev13', evidence_type: 'photo', description: 'test', relevance: 'low', status: 'pending', material_id: `mat-${testMatterId}` } })

        const resF = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/evidence/${evF.evidence_id}`, payload: { description: 'approved', review: 'approved' } })
        expect(resF.statusCode).toBe(200)
        const bodyF = JSON.parse(resF.body)
        expect(bodyF.task_transitioned).toBe(false)
        const unchangedF = await prisma.task.findUnique({ where: { task_id: taskF.task_id } })
        expect(unchangedF?.status).toBe('finalized')

        const taskC = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-14`, matter_id: testMatterId, title: '证据整理', description: 'completed', priority: 'normal', status: 'completed' } })
        const evC = await prisma.evidence.create({ data: { evidence_id: `e-${RUN_ID}-14`, matter_id: testMatterId, title: 'Ev14', evidence_type: 'photo', description: 'test', relevance: 'low', status: 'pending', material_id: `mat-${testMatterId}` } })

        const resC = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/evidence/${evC.evidence_id}`, payload: { description: 'approved', review: 'approved' } })
        expect(resC.statusCode).toBe(200)
        const bodyC = JSON.parse(resC.body)
        expect(bodyC.task_transitioned).toBe(false)
        const unchangedC = await prisma.task.findUnique({ where: { task_id: taskC.task_id } })
        expect(unchangedC?.status).toBe('completed')
    })

    it('illegal lawyer action returns 400', async () => {
        const task = await prisma.task.create({ data: { task_id: `t-${RUN_ID}-15`, matter_id: testMatterId, title: '证据整理', description: 'ai working', priority: 'normal', status: 'ai_working' } })
        const ev = await prisma.evidence.create({ data: { evidence_id: `e-${RUN_ID}-15`, matter_id: testMatterId, title: 'Ev15', evidence_type: 'photo', description: 'test', relevance: 'low', status: 'pending', material_id: `mat-${testMatterId}` } })

        const res = await app.inject({ method: 'PATCH', url: `/matters/${testMatterId}/evidence/${ev.evidence_id}`, payload: { description: 'approved', review: 'approved' } })
        expect(res.statusCode).toBe(400)
        const body = JSON.parse(res.body)
        expect(body.error).toBe('invalid_task_transition')

        const unchanged = await prisma.task.findUnique({ where: { task_id: task.task_id } })
        expect(unchanged?.status).toBe('ai_working')
    })
})
