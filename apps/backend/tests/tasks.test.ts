import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { buildApp } from '../src/server'
import { createPrismaClient } from '@lawdesk/database'

let app: any
let prisma: any
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`
let testMatterId: string

beforeAll(async () => {
  app = await buildApp()
  await app.listen({ port: 0 })
  prisma = createPrismaClient()
  await prisma.task.deleteMany({ where: { task_id: { startsWith: `test-task-${RUN_ID}` } } })
  testMatterId = `test-matter-${RUN_ID}`
  await prisma.matter.create({ data: { matter_id: testMatterId, title: 'Test Matter', description: '', matter_type: 'test', status: 'active' } })
})

afterAll(async () => {
  await prisma.task.deleteMany({ where: { task_id: { startsWith: `test-task-${RUN_ID}` } } })
  await prisma.matter.deleteMany({ where: { matter_id: testMatterId } })
  await app.close()
  await prisma.$disconnect()
})

describe('Tasks API', () => {
  it('creates, lists, updates, and deletes tasks for a matter', async () => {
    const matterId = testMatterId
    const taskId = `test-task-${RUN_ID}-${Date.now()}`

    // create
    const res = await app.inject({ method: 'POST', url: `/matters/${matterId}/tasks`, payload: { task_id: taskId, title: 'Test Task', description: 'desc', priority: 'high', due_date: null, status: 'open' } })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.task_id).toBe(taskId)
    expect(body.matter_id).toBe(matterId)

    // list
    const listRes = await app.inject({ method: 'GET', url: `/matters/${matterId}/tasks` })
    expect(listRes.statusCode).toBe(200)
    const list = JSON.parse(listRes.body)
    expect(Array.isArray(list)).toBe(true)
    const found = list.find((t: any) => t.task_id === taskId)
    expect(found).toBeTruthy()

    // update status
    const patchRes = await app.inject({ method: 'PATCH', url: `/matters/${matterId}/tasks/${taskId}`, payload: { status: 'completed' } })
    expect(patchRes.statusCode).toBe(200)
    const patched = JSON.parse(patchRes.body)
    expect(patched.status).toBe('completed')

    // delete
    const delRes = await app.inject({ method: 'DELETE', url: `/matters/${matterId}/tasks/${taskId}` })
    expect(delRes.statusCode).toBe(204)

    // list again - should not find
    const listRes2 = await app.inject({ method: 'GET', url: `/matters/${matterId}/tasks` })
    const list2 = JSON.parse(listRes2.body)
    const found2 = list2.find((t: any) => t.task_id === taskId)
    expect(found2).toBeFalsy()
  })
})
