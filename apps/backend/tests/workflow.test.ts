import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { buildApp } from '../src/server'
import { createPrismaClient } from '@lawdesk/database'

let app: any
let prisma: any

beforeAll(async () => {
  app = await buildApp()
  await app.listen({ port: 0 })
  prisma = createPrismaClient()
})

afterAll(async () => {
  await app.close()
  await prisma.$disconnect()
})

describe('Workflow Definition API', () => {
  it('creates, lists, and gets a workflow', async () => {
    const payload = {
      name: 'Test Workflow',
      trigger: 'on_matter_created',
      steps: [
        { step_id: 's1', action: 'create_task', requires_confirmation: true, next: 's2' },
        { step_id: 's2', action: 'notify', requires_confirmation: false }
      ]
    }

    const createRes = await app.inject({ method: 'POST', url: '/workflows', payload })
    expect(createRes.statusCode).toBe(201)
    const body = JSON.parse(createRes.body)
    expect(body.workflow_id).toBeTruthy()
    expect(body.name).toBe('Test Workflow')

    const listRes = await app.inject({ method: 'GET', url: '/workflows' })
    expect(listRes.statusCode).toBe(200)
    const listBody = JSON.parse(listRes.body)
    expect(Array.isArray(listBody)).toBe(true)
    expect(listBody.length).toBeGreaterThanOrEqual(1)

    const getRes = await app.inject({ method: 'GET', url: `/workflows/${body.workflow_id}` })
    expect(getRes.statusCode).toBe(200)
    const getBody = JSON.parse(getRes.body)
    expect(getBody.workflow_id).toBe(body.workflow_id)
    expect(getBody.steps.length).toBe(2)
  })
})
