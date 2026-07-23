import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CaseUnderstandingProductService from '../../src/services/context_engine/case_understanding_product_service'

const temporaryRoots: string[] = []

function snapshot() {
  return {
    contextVersion: 'context-engine-c0.1' as const,
    matterId: 'matter-1',
    generatedAt: '2026-07-22T00:00:00.000Z',
    sourceHash: 'a'.repeat(64),
    matter: { matterId: 'matter-1', title: '租赁纠纷', description: '', matterType: '' },
    materials: [{ materialId: 'material-1', title: '合同', materialType: 'text', source: 'client', storageUri: 'storage/a.txt', content: '完整材料', contentLength: 4 }],
    completeness: { complete: true, totalMaterials: 1, readableMaterials: 1, unavailableMaterials: [] },
  }
}

function understanding() {
  return {
    identity: { title: '租赁纠纷', caseType: '房屋租赁合同纠纷', stage: '待确认', jurisdiction: '待确认' },
    narrative: { summary: '双方因租赁发生争议。', background: '双方签订租赁合同。', currentPosture: '待进一步处理。' },
    actors: [
      { id: 'actor-1', name: '甲', role: '出租人', position: '主张合同继续履行' },
      { id: 'actor-2', name: '乙', role: '承租人', position: '要求解除合同' },
    ],
    timeline: [{ id: 'time-1', date: '待确认', event: '双方签订合同', actorIds: ['actor-1', 'actor-2'], certainty: 'confirmed' as const }],
    conflicts: [{ id: 'conflict-1', title: '解除争议', description: '双方对解除条件存在争议', actorIds: ['actor-1', 'actor-2'] }],
    unknowns: [{ id: 'unknown-1', question: '合同解除条件是否成就？', importance: 'high' as const }],
  }
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('CaseUnderstandingProductService', () => {
  it('runs Context to Understanding and records the artifact in AI_Work_Record only', async () => {
    const forbiddenRead = vi.fn(() => { throw new Error('downstream_read_forbidden') })
    const prisma = {
      matter: { findFirst: vi.fn() },
      material: { findMany: vi.fn() },
      aiRecord: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async ({ data }) => ({ ...data, created_at: new Date(), updated_at: new Date() })),
        update: vi.fn(async ({ where, data }) => ({ ai_record_id: where.ai_record_id, matter_id: 'matter-1', ...data, updated_at: new Date('2026-07-22T01:00:00.000Z') })),
        updateMany: vi.fn(async () => ({ count: 0 })),
      },
      evidence: { findMany: forbiddenRead },
      fact: { findMany: forbiddenRead },
      issue: { findMany: forbiddenRead },
      document: { findMany: forbiddenRead },
    }
    const contextBuilder = { build: vi.fn(async () => snapshot()) }
    const generator = { generate: vi.fn(async () => ({ ok: true as const, provider: 'minimax' as const, model: 'MiniMax-M3', promptLength: 100, rawResponse: {}, result: understanding() })) }
    const artifactStore = {
      createRun: vi.fn(async (matterId, runId) => ({
        matterId, runId, directory: '/tmp/run',
        artifacts: { contextSnapshot: 'storage/context-engine-c0.1/matter/run/context-snapshot.json', rawAIResponse: 'storage/context-engine-c0.1/matter/run/raw-ai-response.json', caseUnderstanding: 'storage/context-engine-c0.1/matter/run/case-understanding.json' },
      })),
      saveContextSnapshot: vi.fn(async () => undefined),
      saveGeneration: vi.fn(async () => undefined),
    }
    const service = new CaseUnderstandingProductService(prisma as any, { contextBuilder, generator, artifactStore })

    const result = await service.generate('matter-1')

    expect(result.understanding.identity.caseType).toBe('房屋租赁合同纠纷')
    expect(contextBuilder.build).toHaveBeenCalledWith('matter-1')
    expect(generator.generate).toHaveBeenCalledWith(expect.objectContaining({ matterId: 'matter-1' }))
    expect(prisma.aiRecord.create).toHaveBeenCalledWith({ data: expect.objectContaining({ matter_id: 'matter-1', ai_task_type: 'case_understanding_v1', status: 'running' }) })
    expect(prisma.aiRecord.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) }))
    expect(forbiddenRead).not.toHaveBeenCalled()
  })

  it('loads only the latest completed understanding belonging to the current Matter', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-product-understanding-'))
    temporaryRoots.push(root)
    const relativeResult = 'storage/context-engine-c0.1/matter-1/run-1/case-understanding.json'
    const target = path.join(root, relativeResult)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, JSON.stringify(understanding()))
    const prisma = {
      matter: { findFirst: vi.fn(async () => ({ matter_id: 'matter-1' })) },
      material: { findMany: vi.fn() },
      aiRecord: {
        findFirst: vi.fn(async () => ({
          ai_record_id: 'run-1', matter_id: 'matter-1', ai_task_type: 'case_understanding_v1', status: 'completed', model: 'MiniMax-M3', result_uri: relativeResult, updated_at: new Date('2026-07-22T01:00:00.000Z'),
        })),
      },
    }
    const service = new CaseUnderstandingProductService(prisma as any, { repositoryRoot: root })

    const result = await service.latest('matter-1')

    expect(result.aiRecordId).toBe('run-1')
    expect(prisma.aiRecord.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { matter_id: 'matter-1', ai_task_type: 'case_understanding_v1', status: 'completed' },
      orderBy: { created_at: 'desc' },
    }))
  })
})
