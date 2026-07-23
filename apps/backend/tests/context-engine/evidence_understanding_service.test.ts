import { describe, expect, it, vi } from 'vitest'
import EvidenceUnderstandingService from '../../src/services/context_engine/evidence_understanding_service'

const matterId = 'matter-ruifeng-haoda'

function caseUnderstanding() {
  return {
    identity: {
      title: '瑞峰自动化设备有限公司与浩达精密制造有限公司设备采购纠纷',
      caseType: '设备买卖合同纠纷',
      stage: '诉前争议阶段',
      jurisdiction: '待确认',
    },
    narrative: {
      summary: '瑞峰向浩达采购自动化设备，双方对交付、验收及价款结算存在争议。',
      background: '双方签订自动化设备买卖合同。',
      currentPosture: '双方正在核对设备交付和验收情况。',
    },
    actors: [
      { id: 'actor-1', name: '瑞峰自动化设备有限公司', role: '买方', position: '主张设备存在交付和验收问题' },
      { id: 'actor-2', name: '浩达精密制造有限公司', role: '卖方', position: '主张已经履行交付义务' },
    ],
    timeline: [{ id: 'time-1', date: '2025-01-10', event: '双方签订设备买卖合同', actorIds: ['actor-1', 'actor-2'], certainty: 'confirmed' as const }],
    conflicts: [{ id: 'conflict-1', title: '设备交付及验收争议', description: '双方对设备是否完成交付验收存在分歧', actorIds: ['actor-1', 'actor-2'] }],
    unknowns: [{ id: 'unknown-1', question: '双方是否签署最终验收文件？', importance: 'high' as const }],
  }
}

function snapshot() {
  return {
    contextVersion: 'context-engine-c0.1' as const,
    matterId,
    generatedAt: '2026-07-22T00:00:00.000Z',
    sourceHash: 'a'.repeat(64),
    matter: { matterId, title: '瑞峰诉浩达设备采购纠纷', description: '', matterType: '设备买卖合同纠纷' },
    materials: [
      {
        materialId: 'material-contract',
        title: '自动化设备买卖合同',
        materialType: 'contract',
        source: 'client',
        storageUri: 'storage/ruifeng/contract.txt',
        content: '瑞峰自动化设备有限公司向浩达精密制造有限公司采购自动化生产设备。',
        contentLength: 34,
      },
      {
        materialId: 'material-delivery',
        title: '设备交付记录',
        materialType: 'record',
        source: 'client',
        storageUri: 'storage/ruifeng/delivery.txt',
        content: '交付记录载明设备运抵时间，但未见双方签署的最终验收结论。',
        contentLength: 30,
      },
    ],
    completeness: { complete: true, totalMaterials: 2, readableMaterials: 2, unavailableMaterials: [] },
  }
}

function prisma() {
  return {
    matter: { findFirst: vi.fn() },
    material: { findMany: vi.fn() },
    aiRecord: {
      create: vi.fn(async ({ data }) => data),
      update: vi.fn(async ({ data }) => data),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
  }
}

function artifactStore() {
  return {
    createRun: vi.fn(async (_matterId, runId) => ({
      runId,
      directory: '/tmp/evidence-understanding-test',
      inputUri: 'storage/context-engine-c0.3/input.json',
      rawResponseUri: 'storage/context-engine-c0.3/raw.json',
      resultUri: 'storage/context-engine-c0.3/result.json',
    })),
    saveInput: vi.fn(async () => undefined),
    saveRawResponse: vi.fn(async () => undefined),
    saveResult: vi.fn(async () => undefined),
  }
}

describe('EvidenceUnderstandingService', () => {
  it('uses equipment-sale Case Understanding and full current-Matter Material text', async () => {
    const generate = vi.fn(async () => ({
      provider: 'minimax',
      model: 'MiniMax-M3',
      response: {
        choices: [{ message: { content: JSON.stringify({
          evidence_drafts: [{
            draft_id: 'draft-contract',
            material_id: 'material-contract',
            title: '自动化设备买卖合同证据',
            evidence_type: 'contract',
            proof_purpose: '证明双方存在自动化设备买卖合同关系及约定内容',
            proof_relationship: '该合同直接对应双方是否成立设备买卖合同关系的核心争议',
            importance: 'critical',
            legal_use: '用于证明设备买卖合同成立及双方约定的主要权利义务',
            source_material_ids: ['material-contract'],
            materials: [{ material_id: 'material-contract', title: '自动化设备买卖合同' }],
            summary: '材料记载双方采购自动化生产设备。',
            reasoning: '合同正文能够支持交易主体和设备采购关系。',
            confidence: 0.9,
            source: 'client',
            suggested_action: 'confirm_as_evidence',
          }],
        }) } }],
      },
    }))
    const database = prisma()
    const artifacts = artifactStore()
    const service = new EvidenceUnderstandingService(database as any, {
      caseUnderstandingReader: { latest: vi.fn(async () => ({
        aiRecordId: 'case-understanding-run', matterId, status: 'completed', model: 'MiniMax-M3', generatedAt: '', understanding: caseUnderstanding(),
      })) },
      contextBuilder: { build: vi.fn(async () => snapshot()) },
      generator: { generate },
      artifactStore: artifacts,
    })

    const result = await service.generate(matterId)

    const prompt = generate.mock.calls[0][0].user_prompt
    expect(prompt).toContain('设备买卖合同纠纷')
    expect(prompt).toContain('瑞峰自动化设备有限公司')
    expect(prompt).toContain('浩达精密制造有限公司')
    expect(prompt).toContain('瑞峰自动化设备有限公司向浩达精密制造有限公司采购自动化生产设备。')
    expect(prompt).toContain('交付记录载明设备运抵时间，但未见双方签署的最终验收结论。')
    expect(prompt).not.toContain('借贷合意证据')
    expect(prompt).not.toContain('借款资金交付证据')
    expect(result.evidence_drafts[0].source_material_ids).toEqual(['material-contract'])
    expect(result.evidence_drafts[0].materials).toEqual([{ material_id: 'material-contract', title: '自动化设备买卖合同' }])
    expect(artifacts.saveRawResponse).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ rawResponse: expect.anything() }))
  })

  it('rejects a source Material that does not belong to the current Matter', async () => {
    const database = prisma()
    const service = new EvidenceUnderstandingService(database as any, {
      caseUnderstandingReader: { latest: vi.fn(async () => ({
        aiRecordId: 'case-understanding-run', matterId, status: 'completed', model: 'MiniMax-M3', generatedAt: '', understanding: caseUnderstanding(),
      })) },
      contextBuilder: { build: vi.fn(async () => snapshot()) },
      generator: { generate: vi.fn(async () => ({ response: { choices: [{ message: { content: JSON.stringify({ evidence_drafts: [{
        draft_id: 'bad-draft', material_id: 'other-matter-material', title: '错误证据', evidence_type: 'document', proof_purpose: '错误证明目的', source_material_ids: ['other-matter-material'], summary: '', reasoning: '', confidence: 0.8, source: 'client', suggested_action: 'confirm_as_evidence',
      }] }) } }] } })) },
      artifactStore: artifactStore(),
    })

    await expect(service.generate(matterId)).rejects.toThrow('evidence_draft_contract_invalid')
    expect(database.aiRecord.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'failed' } }))
  })
})
