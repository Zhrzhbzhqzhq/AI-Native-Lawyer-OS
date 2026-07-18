import Fastify from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import devRoutes from '../src/routes/devRoutes'
import DevMatterPurgeService from '../src/services/devMatterPurgeService'
import MatterService from '../src/services/matterService'

const matterId = 'm-dev-purge-test'

const modelNames = [
  'matter',
  'material',
  'evidence',
  'factDraft',
  'fact',
  'issueDraft',
  'issue',
  'lawDraft',
  'lawIssue',
  'law',
  'argumentDraft',
  'argumentFact',
  'argumentIssue',
  'argumentLaw',
  'argument',
  'documentDraft',
  'documentArgument',
  'documentFact',
  'documentIssue',
  'documentLaw',
  'document',
  'task',
  'executionQueueItem',
  'aiRecord',
  'workspace',
  'timeline',
  'knowledge',
  'client',
  'workflowEvent',
  'factEvidence',
  'issueFact',
] as const

function createDelegate(name: string, calls: string[], overrides: Record<string, any> = {}) {
  return {
    findUnique: vi.fn(async () => ({ matter_id: matterId })),
    count: vi.fn(async () => 0),
    updateMany: vi.fn(async () => ({ count: 1 })),
    deleteMany: vi.fn(async () => {
      calls.push(name)
      return { count: 1 }
    }),
    update: vi.fn(async (args) => args),
    ...overrides,
  }
}

function createMockPrisma(overrides: Record<string, any> = {}) {
  const calls: string[] = []
  const tx: Record<string, any> = {}
  for (const name of modelNames) {
    tx[name] = createDelegate(name, calls)
  }

  Object.assign(tx, overrides)

  const prisma = {
    ...tx,
    $transaction: vi.fn(async (fn: any) => fn(tx)),
  }

  return { prisma: prisma as any, tx, calls }
}

function setEnv(nodeEnv: string, enableDevPurge?: string) {
  vi.stubEnv('NODE_ENV', nodeEnv)
  if (enableDevPurge === undefined) vi.stubEnv('ENABLE_DEV_PURGE', '')
  else vi.stubEnv('ENABLE_DEV_PURGE', enableDevPurge)
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Developer-only Matter Purge', () => {
  it('development + ENABLE_DEV_PURGE=true + correct confirmation permanently purges a matter', async () => {
    setEnv('development', 'true')
    const { prisma } = createMockPrisma()
    const app = Fastify()
    await app.register(devRoutes, { prisma })

    const res = await app.inject({
      method: 'POST',
      url: `/dev/matters/${matterId}/purge`,
      payload: { confirm: 'PURGE_MATTER', matter_id: matterId },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.found).toBe(true)
    expect(body.purged).toBe(true)
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    await app.close()
  })

  it('rejects missing confirmation parameters', async () => {
    setEnv('development', 'true')
    const { prisma } = createMockPrisma()
    const app = Fastify()
    await app.register(devRoutes, { prisma })

    const res = await app.inject({
      method: 'POST',
      url: `/dev/matters/${matterId}/purge`,
      payload: { confirm: 'PURGE_MATTER' },
    })

    expect(res.statusCode).toBe(400)
    expect(prisma.$transaction).not.toHaveBeenCalled()
    await app.close()
  })

  it('rejects when ENABLE_DEV_PURGE is false', async () => {
    setEnv('development', 'false')
    const { prisma } = createMockPrisma()
    const app = Fastify()
    await app.register(devRoutes, { prisma })

    const res = await app.inject({
      method: 'POST',
      url: `/dev/matters/${matterId}/purge`,
      payload: { confirm: 'PURGE_MATTER', matter_id: matterId },
    })

    expect(res.statusCode).toBe(403)
    expect(prisma.$transaction).not.toHaveBeenCalled()
    await app.close()
  })

  it('rejects in production', async () => {
    setEnv('production', 'true')
    const { prisma } = createMockPrisma()
    const app = Fastify()
    await app.register(devRoutes, { prisma })

    const res = await app.inject({
      method: 'POST',
      url: `/dev/matters/${matterId}/purge`,
      payload: { confirm: 'PURGE_MATTER', matter_id: matterId },
    })

    expect(res.statusCode).toBe(404)
    expect(prisma.$transaction).not.toHaveBeenCalled()
    await app.close()
  })

  it('returns a clear result when matter does not exist', async () => {
    setEnv('development', 'true')
    const { prisma } = createMockPrisma({
      matter: createDelegate('matter', [], {
        findUnique: vi.fn(async () => null),
        count: vi.fn(async () => 0),
        deleteMany: vi.fn(async () => ({ count: 0 })),
      }),
    })
    const app = Fastify()
    await app.register(devRoutes, { prisma })

    const res = await app.inject({
      method: 'DELETE',
      url: `/dev/matters/${matterId}/purge`,
      payload: { confirm: 'PURGE_MATTER', matter_id: matterId },
    })

    expect(res.statusCode).toBe(404)
    const body = JSON.parse(res.body)
    expect(body.found).toBe(false)
    expect(body.purged).toBe(false)
    await app.close()
  })

  it('deletes all associated records in the developer purge order', async () => {
    const { prisma, calls } = createMockPrisma()
    const service = new DevMatterPurgeService(prisma)

    const result = await service.purgeMatter(matterId)

    expect(result.remaining).toMatchObject({
      matter: 0,
      materials: 0,
      evidence: 0,
      fact_drafts: 0,
      facts: 0,
      issue_drafts: 0,
      issues: 0,
      law_drafts: 0,
      law_issue: 0,
      laws: 0,
      argument_drafts: 0,
      argument_fact: 0,
      argument_issue: 0,
      argument_law: 0,
      arguments: 0,
      document_drafts: 0,
      document_argument: 0,
      document_fact: 0,
      document_issue: 0,
      document_law: 0,
      documents: 0,
      tasks: 0,
      execution: 0,
      ai_records: 0,
      workspaces: 0,
      timelines: 0,
      knowledge: 0,
      clients: 0,
      workflow_events: 0,
    })
    expect(calls).toEqual([
      'factEvidence',
      'issueFact',
      'lawIssue',
      'argumentFact',
      'argumentIssue',
      'argumentLaw',
      'documentArgument',
      'documentFact',
      'documentIssue',
      'documentLaw',
      'aiRecord',
      'documentDraft',
      'argumentDraft',
      'argument',
      'client',
      'document',
      'evidence',
      'factDraft',
      'fact',
      'issueDraft',
      'issue',
      'lawDraft',
      'knowledge',
      'law',
      'material',
      'task',
      'timeline',
      'workflowEvent',
      'workspace',
      'executionQueueItem',
      'matter',
    ])
  })

  it('uses a transaction so failures roll back through Prisma', async () => {
    const calls: string[] = []
    const { prisma } = createMockPrisma({
      evidence: createDelegate('evidence', calls, {
        deleteMany: vi.fn(async () => {
          throw new Error('forced_failure')
        }),
      }),
    })
    const service = new DevMatterPurgeService(prisma)

    await expect(service.purgeMatter(matterId)).rejects.toThrow('forced_failure')
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('keeps existing DELETE /matters/:id semantics as soft delete', async () => {
    const { prisma } = createMockPrisma()
    const service = new MatterService(prisma)

    await service.remove(matterId)

    expect(prisma.matter.update).toHaveBeenCalledWith({
      where: { matter_id: matterId },
      data: { status: 'deleted' },
    })
    expect(prisma.matter.deleteMany).not.toHaveBeenCalled()
  })
})

describe('Developer Reset', () => {
  it('development + ENABLE_DEV_RESET=true clears all business data', async () => {
    setEnv('development')
    vi.stubEnv('ENABLE_DEV_RESET', 'true')
    const { prisma } = createMockPrisma()
    const app = Fastify()
    await app.register(devRoutes, { prisma })

    const res = await app.inject({
      method: 'POST',
      url: '/dev/reset',
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(body.deleted).toMatchObject({
      matter: 1,
      materials: 1,
      evidence: 1,
      fact_drafts: 1,
      facts: 1,
      issue_drafts: 1,
      issues: 1,
      law_drafts: 1,
      law_issue: 1,
      laws: 1,
      argument_drafts: 1,
      argument_fact: 1,
      argument_issue: 1,
      argument_law: 1,
      arguments: 1,
      document_drafts: 1,
      document_argument: 1,
      document_fact: 1,
      document_issue: 1,
      document_law: 1,
      documents: 1,
      tasks: 1,
      execution: 1,
      ai_records: 1,
      workspaces: 1,
      timelines: 1,
    })
    expect(body.remaining).toMatchObject({
      matter: 0,
      materials: 0,
      evidence: 0,
      fact_drafts: 0,
      facts: 0,
      issue_drafts: 0,
      issues: 0,
      law_drafts: 0,
      law_issue: 0,
      laws: 0,
      argument_drafts: 0,
      argument_fact: 0,
      argument_issue: 0,
      argument_law: 0,
      arguments: 0,
      document_drafts: 0,
      document_argument: 0,
      document_fact: 0,
      document_issue: 0,
      document_law: 0,
      documents: 0,
      tasks: 0,
      execution: 0,
      ai_records: 0,
      workspaces: 0,
      timelines: 0,
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    await app.close()
  })

  it('rejects reset outside development', async () => {
    setEnv('test')
    vi.stubEnv('ENABLE_DEV_RESET', 'true')
    const { prisma } = createMockPrisma()
    const app = Fastify()
    await app.register(devRoutes, { prisma })

    const res = await app.inject({
      method: 'POST',
      url: '/dev/reset',
    })

    expect(res.statusCode).toBe(403)
    expect(prisma.$transaction).not.toHaveBeenCalled()
    await app.close()
  })

  it('rejects reset when ENABLE_DEV_RESET is not true', async () => {
    setEnv('development')
    vi.stubEnv('ENABLE_DEV_RESET', 'false')
    const { prisma } = createMockPrisma()
    const app = Fastify()
    await app.register(devRoutes, { prisma })

    const res = await app.inject({
      method: 'POST',
      url: '/dev/reset',
    })

    expect(res.statusCode).toBe(403)
    expect(prisma.$transaction).not.toHaveBeenCalled()
    await app.close()
  })

  it('deletes all business data in the developer reset order', async () => {
    const { prisma, calls } = createMockPrisma()
    const service = new DevMatterPurgeService(prisma)

    const result = await service.resetBusinessData()

    expect(result.success).toBe(true)
    expect(calls).toEqual([
      'factEvidence',
      'issueFact',
      'lawIssue',
      'argumentFact',
      'argumentIssue',
      'argumentLaw',
      'documentArgument',
      'documentFact',
      'documentIssue',
      'documentLaw',
      'aiRecord',
      'documentDraft',
      'argumentDraft',
      'argument',
      'client',
      'document',
      'evidence',
      'factDraft',
      'fact',
      'issueDraft',
      'issue',
      'lawDraft',
      'knowledge',
      'law',
      'material',
      'task',
      'timeline',
      'workflowEvent',
      'workspace',
      'executionQueueItem',
      'matter',
    ])
  })

  it('rolls back reset through Prisma transaction on failure', async () => {
    const calls: string[] = []
    const { prisma } = createMockPrisma({
      document: createDelegate('document', calls, {
        deleteMany: vi.fn(async () => {
          throw new Error('reset_failure')
        }),
      }),
    })
    const service = new DevMatterPurgeService(prisma)

    await expect(service.resetBusinessData()).rejects.toThrow('reset_failure')
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })
})
