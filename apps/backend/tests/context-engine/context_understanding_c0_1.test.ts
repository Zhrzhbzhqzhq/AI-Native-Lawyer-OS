import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CaseUnderstandingGenerator from '../../src/services/context_engine/case_understanding_generator'
import CaseUnderstandingValidator from '../../src/services/context_engine/case_understanding_validator'
import ContextArtifactStore from '../../src/services/context_engine/context_artifact_store'
import type { MinimalMatterContextSnapshot } from '../../src/services/context_engine/context_types'
import MinimalContextBuilder from '../../src/services/context_engine/minimal_context_builder'

const temporaryRoots: string[] = []

function snapshot(): MinimalMatterContextSnapshot {
  return {
    contextVersion: 'context-engine-c0.1',
    matterId: 'matter-c0-1',
    generatedAt: '2026-07-22T00:00:00.000Z',
    sourceHash: 'a'.repeat(64),
    matter: {
      matterId: 'matter-c0-1',
      title: '房屋租赁合同纠纷',
      description: '仅作为案件背景',
      matterType: '合同纠纷',
    },
    materials: [
      {
        materialId: 'material-1',
        title: '租赁合同及沟通记录',
        materialType: 'text',
        source: 'client',
        storageUri: 'storage/intake-uploads/material-1.txt',
        content: '出租人与承租人签订房屋租赁合同。承租人随后反映房屋渗水并要求维修。',
        contentLength: 37,
      },
      {
        materialId: 'material-2',
        title: '解除通知',
        materialType: 'text',
        source: 'client',
        storageUri: 'storage/intake-uploads/material-2.txt',
        content: '承租人发出解除通知，出租人不认可解除理由。',
        contentLength: 22,
      },
    ],
    completeness: {
      complete: true,
      totalMaterials: 2,
      readableMaterials: 2,
      unavailableMaterials: [],
    },
  }
}

function validResult() {
  return {
    identity: {
      title: '房屋租赁合同纠纷',
      caseType: '房屋租赁合同纠纷',
      stage: '争议中',
      jurisdiction: '待确认',
    },
    narrative: {
      summary: '双方因房屋维修和合同解除发生争议。',
      background: '双方签订房屋租赁合同。',
      currentPosture: '承租人已通知解除，出租人不认可。',
    },
    actors: [
      { id: 'actor-1', name: '承租人', role: '承租人', position: '要求维修并解除合同' },
      { id: 'actor-2', name: '出租人', role: '出租人', position: '不认可解除理由' },
    ],
    timeline: [
      { id: 'time-1', date: '待确认', event: '双方签订租赁合同', actorIds: ['actor-1', 'actor-2'], certainty: 'confirmed' },
    ],
    conflicts: [
      { id: 'conflict-1', title: '解除效力争议', description: '双方对解除理由存在分歧', actorIds: ['actor-1', 'actor-2'] },
    ],
    unknowns: [
      { id: 'unknown-1', question: '维修完成情况如何？', importance: 'high' },
    ],
  }
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('CaseUnderstandingGenerator', () => {
  it('sends the complete Context Snapshot without using downstream prompts', async () => {
    const generate = vi.fn(async () => ({
      provider: 'minimax',
      model: 'MiniMax-M3',
      response: {
        choices: [{ message: { content: JSON.stringify(validResult()) } }],
      },
    }))
    const input = snapshot()

    const generation = await new CaseUnderstandingGenerator({ generate }).generate(input)

    expect(generation.ok).toBe(true)
    expect(generate).toHaveBeenCalledTimes(1)
    const promptPack = generate.mock.calls[0][0]
    expect(promptPack.context_pack).toBe(input)
    expect(promptPack.user_prompt).toContain(JSON.stringify(input, null, 2))
    expect(promptPack.user_prompt).toContain(input.materials[0].content)
    expect(promptPack.user_prompt).toContain(input.materials[1].content)
    expect(promptPack.prompt_version).toBe('context-engine-c0.1-case-understanding-v2')
    expect(promptPack.task).toBe('context_engine_case_understanding')
    expect(promptPack.user_prompt).toContain('case-understanding-contract-v1')
    expect(promptPack.user_prompt).toContain('禁止空字符串')
    expect(promptPack.user_prompt).toContain('逐字填写“待确认”')
    expect(promptPack.user_prompt).not.toContain('fact-draft-v1')
    expect(promptPack.user_prompt).not.toContain('issue-draft-v1')
    expect(promptPack.user_prompt).not.toContain('evidence-draft-v1')
  })

  it('returns provider diagnostics instead of losing a MiniMax failure', async () => {
    const generate = vi.fn(async () => {
      const error = new Error('http_503')
      ;(error as any).code = 'http_503'
      throw error
    })

    const generation = await new CaseUnderstandingGenerator({ generate }).generate(snapshot())

    expect(generation).toEqual(expect.objectContaining({
      ok: false,
      provider: 'minimax',
      model: expect.any(String),
      rawResponse: null,
      error: { code: 'http_503', message: 'http_503' },
    }))
  })
})

describe('CaseUnderstandingValidator Contract V1', () => {
  it.each([
    ['case-003', '房屋租赁合同纠纷'],
    ['case-006', '股权转让合同纠纷'],
  ])('%s does not allow an empty caseType for %s', (_caseId, title) => {
    const result = validResult()
    result.identity.title = title
    result.identity.caseType = ''

    const validation = new CaseUnderstandingValidator().validate(result)

    expect(validation.ok).toBe(false)
    if (!validation.ok) expect(validation.issues).toContainEqual(expect.objectContaining({ path: 'identity.caseType' }))
  })

  it.each(['', 'unknown', '未知', '不详', '待定'])(
    'requires “待确认” instead of unknown value %j',
    (unknownValue) => {
      const result = validResult()
      result.identity.jurisdiction = unknownValue

      const validation = new CaseUnderstandingValidator().validate(result)

      expect(validation.ok).toBe(false)
      if (!validation.ok) expect(validation.issues).toContainEqual(expect.objectContaining({ path: 'identity.jurisdiction' }))
    },
  )

  it('accepts “待确认” for an unknown identity field and timeline date', () => {
    const result = validResult()
    result.identity.jurisdiction = '待确认'
    result.timeline[0].date = '待确认'

    expect(new CaseUnderstandingValidator().validate(result).ok).toBe(true)
  })
})

describe('ContextArtifactStore', () => {
  it('saves Context, Raw AI Response and Case Understanding for a successful run', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-context-artifacts-'))
    temporaryRoots.push(root)
    const store = new ContextArtifactStore({ repositoryRoot: root })
    const run = await store.createRun('matter-c0-1', 'run-success')
    const input = snapshot()
    const rawResponse = { provider: 'minimax', response: { choices: [{ message: { content: '{}' } }] } }
    const generation = {
      ok: true as const,
      provider: 'minimax' as const,
      model: 'MiniMax-M3',
      promptLength: 1234,
      rawResponse,
      result: validResult(),
    }

    await store.saveContextSnapshot(run, input)
    await store.saveGeneration(run, generation)

    const savedContext = JSON.parse(await readFile(path.join(root, run.artifacts.contextSnapshot), 'utf8'))
    const savedRaw = JSON.parse(await readFile(path.join(root, run.artifacts.rawAIResponse), 'utf8'))
    const savedResult = JSON.parse(await readFile(path.join(root, run.artifacts.caseUnderstanding), 'utf8'))
    expect(savedContext).toEqual(input)
    expect(savedRaw.rawResponse).toEqual(rawResponse)
    expect(savedResult).toEqual(validResult())
  })

  it('still saves Raw diagnostics and a failed result when MiniMax fails', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-context-artifacts-'))
    temporaryRoots.push(root)
    const store = new ContextArtifactStore({ repositoryRoot: root })
    const run = await store.createRun('matter-c0-1', 'run-failed')
    const input = snapshot()
    const generation = await new CaseUnderstandingGenerator({
      generate: async () => { throw new Error('http_401') },
    }).generate(input)

    await store.saveContextSnapshot(run, input)
    await store.saveGeneration(run, generation)

    const savedRaw = JSON.parse(await readFile(path.join(root, run.artifacts.rawAIResponse), 'utf8'))
    const savedResult = JSON.parse(await readFile(path.join(root, run.artifacts.caseUnderstanding), 'utf8'))
    expect(savedRaw).toEqual(expect.objectContaining({
      status: 'failed',
      rawResponse: null,
      error: { code: 'http_401', message: 'http_401' },
    }))
    expect(savedResult).toEqual(expect.objectContaining({
      status: 'failed',
      matterId: 'matter-c0-1',
      runId: 'run-failed',
      error: { code: 'http_401', message: 'http_401' },
    }))
  })
})

describe('Context Engine business-object boundary', () => {
  it('builds only from Matter and current Matter Materials', async () => {
    const forbiddenRead = vi.fn(() => { throw new Error('forbidden_business_object_read') })
    const prisma = {
      matter: {
        findFirst: vi.fn(async () => ({ matter_id: 'matter-c0-1', title: '案件', status: 'active' })),
      },
      material: {
        findMany: vi.fn(async () => [{
          material_id: 'material-1',
          matter_id: 'matter-c0-1',
          title: '材料',
          source: 'client',
          storage_uri: 'storage/intake-uploads/material.txt',
        }]),
      },
      evidence: { findMany: forbiddenRead },
      fact: { findMany: forbiddenRead },
      issue: { findMany: forbiddenRead },
      document: { findMany: forbiddenRead },
    }
    const reader = {
      read: vi.fn(async (storageUri: string) => ({ storageUri, content: '完整材料正文', contentLength: 6 })),
    }

    const result = await new MinimalContextBuilder(prisma as any, reader).build('matter-c0-1')

    expect(result.materials[0].content).toBe('完整材料正文')
    expect(forbiddenRead).not.toHaveBeenCalled()
    expect(prisma.material.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { matter_id: 'matter-c0-1' },
    }))
  })
})
