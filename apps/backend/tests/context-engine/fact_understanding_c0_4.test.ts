import { describe, expect, it, vi } from 'vitest'
import FactDraftService from '../../src/services/factDraftService'
import FactUnderstandingService from '../../src/services/context_engine/fact_understanding_service'

const matterId = 'matter-ruifeng-haoda'

const understanding = {
  identity: { title: '瑞峰自动化设备有限公司与浩达精密制造有限公司设备采购纠纷', caseType: '设备买卖合同纠纷', stage: '诉前', jurisdiction: '待确认' },
  narrative: { summary: '双方围绕设备采购、付款和交付发生争议。', background: '双方存在设备采购交易。', currentPosture: '待律师审核证据和事实。' },
  actors: [
    { id: 'actor-1', name: '瑞峰自动化设备有限公司', role: '买方', position: '待确认' },
    { id: 'actor-2', name: '浩达精密制造有限公司', role: '卖方', position: '待确认' },
  ],
  timeline: [],
  conflicts: [{ id: 'conflict-1', title: '设备采购履行争议', description: '付款、交付和安装调试情况需要核验。', actorIds: ['actor-1', 'actor-2'] }],
  unknowns: [{ id: 'unknown-1', question: '最终验收情况待确认', importance: 'high' as const }],
}

const evidenceRows = [
  {
    evidence_id: 'evidence-contract', matter_id: matterId, material_id: 'material-contract', title: '设备采购合同', evidence_type: 'contract',
    description: '合同材料', relevance: '证明合同签订及主要约定', status: 'active', created_at: new Date('2026-01-01'),
    material: { material_id: 'material-contract', matter_id: matterId, title: '设备采购合同', material_type: 'contract', source: 'client', storage_uri: 'storage/intake-uploads/ruifeng/contract.txt' },
  },
  {
    evidence_id: 'evidence-payment', matter_id: matterId, material_id: 'material-payment', title: '付款记录', evidence_type: 'payment_record',
    description: '付款材料', relevance: '证明采购款支付情况', status: 'active', created_at: new Date('2026-01-02'),
    material: { material_id: 'material-payment', matter_id: matterId, title: '付款记录', material_type: 'payment_record', source: 'client', storage_uri: 'storage/intake-uploads/ruifeng/payment.txt' },
  },
  {
    evidence_id: 'evidence-installation', matter_id: matterId, material_id: 'material-installation', title: '安装调试记录', evidence_type: 'service_record',
    description: '安装调试材料', relevance: '证明设备安装调试过程', status: 'active', created_at: new Date('2026-01-03'),
    material: { material_id: 'material-installation', matter_id: matterId, title: '安装调试记录', material_type: 'service_record', source: 'client', storage_uri: 'storage/intake-uploads/ruifeng/installation.txt' },
  },
]

function artifacts() {
  return {
    createRun: vi.fn(async (_matterId, runId) => ({
      runId, directory: '/tmp/fact-understanding-test', inputUri: 'storage/context-engine-c0.4/input.json',
      rawResponseUri: 'storage/context-engine-c0.4/raw.json', resultUri: 'storage/context-engine-c0.4/result.json',
    })),
    saveInput: vi.fn(async () => undefined),
    saveRawResponse: vi.fn(async () => undefined),
    saveResult: vi.fn(async () => undefined),
  }
}

describe('Context Engine C0.4-A Fact Understanding', () => {
  it('generates contract, payment and delivery facts from RuiFeng formal evidence and source Material text', async () => {
    const materialBodies: Record<string, string> = {
      'storage/intake-uploads/ruifeng/contract.txt': '设备采购合同载明瑞峰公司向浩达公司采购自动化设备，并约定设备规格和价款。',
      'storage/intake-uploads/ruifeng/payment.txt': '付款记录载明瑞峰公司按设备采购合同向浩达公司支付采购款。',
      'storage/intake-uploads/ruifeng/installation.txt': '安装调试记录载明浩达公司将设备运抵现场并开展安装调试。',
    }
    const aiDrafts = [
      { title: '双方签订设备采购合同', description: '设备采购合同载明双方约定自动化设备的规格和价款。', category: 'confirmed', source_evidence_ids: ['evidence-contract'], confidence: 0.95, ai_reasoning: '合同正文直接记载。' },
      { title: '瑞峰公司支付设备采购款', description: '付款记录载明瑞峰公司向浩达公司支付设备采购款。', category: 'confirmed', source_evidence_ids: ['evidence-payment'], confidence: 0.9, ai_reasoning: '付款记录正文直接记载。' },
      { title: '浩达公司开展设备交付及安装调试', description: '安装调试记录载明设备运抵现场并开展安装调试。', category: 'confirmed', source_evidence_ids: ['evidence-installation'], confidence: 0.9, ai_reasoning: '安装调试记录正文直接记载。' },
    ]
    const generate = vi.fn(async () => ({
      provider: 'minimax', model: 'MiniMax-M3', prompt_version: 'fact-understanding-v1',
      ai_audit: { provider: 'minimax', model: 'MiniMax-M3', prompt_version: 'fact-understanding-v1', fallback_used: false },
      response: { choices: [{ message: { content: JSON.stringify({ fact_drafts: aiDrafts }) } }] },
    }))
    const database = {
      matter: { findFirst: vi.fn() },
      material: { findMany: vi.fn() },
      evidence: { findMany: vi.fn(async () => evidenceRows) },
      aiRecord: {
        create: vi.fn(async ({ data }) => data), update: vi.fn(async ({ data }) => data), updateMany: vi.fn(async () => ({ count: 0 })),
      },
    }
    const artifactStore = artifacts()
    const service = new FactUnderstandingService(database as any, {
      caseUnderstandingReader: { latest: vi.fn(async () => ({ aiRecordId: 'cu-run', matterId, status: 'completed', model: 'MiniMax-M3', generatedAt: '', understanding })) },
      materialReader: { read: vi.fn(async (storageUri: string) => ({ storageUri, content: materialBodies[storageUri], contentLength: materialBodies[storageUri].length })) },
      generator: { generate },
      artifactStore,
    })

    const result = await service.generate(matterId)
    const prompt = generate.mock.calls[0][0].user_prompt

    expect(prompt).toContain('设备买卖合同纠纷')
    expect(prompt).toContain(materialBodies['storage/intake-uploads/ruifeng/contract.txt'])
    expect(prompt).toContain(materialBodies['storage/intake-uploads/ruifeng/payment.txt'])
    expect(prompt).toContain(materialBodies['storage/intake-uploads/ruifeng/installation.txt'])
    expect(prompt).not.toMatch(/借款|借贷|本金|利息|还款/)
    expect(result.suggestions.map((draft) => draft.title)).toEqual([
      '双方签订设备采购合同', '瑞峰公司支付设备采购款', '浩达公司开展设备交付及安装调试',
    ])
    expect(JSON.stringify(result.suggestions)).not.toMatch(/借款|借贷|本金|利息|还款/)
    expect(artifactStore.saveRawResponse).toHaveBeenCalled()
  })

  it('is used by FactDraftService while preserving the existing Fact Draft DTO', async () => {
    const create = vi.fn(async ({ data }) => ({ id: 'row-1', ...data, created_at: new Date(), updated_at: new Date(), lawyer_note: null, published_fact_id: null, published_at: null }))
    const database = {
      factDraft: { findMany: vi.fn(async () => []) },
      evidence: { findMany: vi.fn(async () => evidenceRows) },
      $transaction: vi.fn(async (callback) => callback({ factDraft: { create } })),
    }
    const generated = {
      suggestions: [{ title: '双方签订设备采购合同', description: '合同正文载明双方签订设备采购合同。', category: 'confirmed', source_evidence_ids: ['evidence-contract'], confidence: 0.95, ai_reasoning: '合同正文直接记载。' }],
      aiAudit: { provider: 'minimax', model: 'MiniMax-M3', prompt_version: 'fact-understanding-v1', fallback_used: false },
    }
    const service = new FactDraftService(database as any, () => ({ generate: vi.fn(async () => generated) }) as any)

    const result = await service.generateDrafts(matterId)

    expect(result.fact_drafts[0]).toEqual(expect.objectContaining({
      matter_id: matterId,
      title: '双方签订设备采购合同',
      source_evidence_ids: JSON.stringify(['evidence-contract']),
      review_status: 'pending',
    }))
    expect(result.ai_audit?.prompt_version).toBe('fact-understanding-v1')
  })
})
