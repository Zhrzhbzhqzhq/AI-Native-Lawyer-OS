import { describe, expect, it, vi } from 'vitest'
import IssueDraftService from '../../src/services/issueDraftService'
import IssueUnderstandingService from '../../src/services/context_engine/issue_understanding_service'

const matterId = 'matter-ruifeng-haoda'

const understanding = {
  identity: { title: '瑞峰自动化设备有限公司与浩达精密制造有限公司设备采购纠纷', caseType: '设备买卖合同纠纷', stage: '诉前', jurisdiction: '待确认' },
  narrative: { summary: '双方围绕设备采购、付款、交付和安装调试发生争议。', background: '双方存在设备采购交易。', currentPosture: '待律师审查争议焦点。' },
  actors: [
    { id: 'actor-1', name: '瑞峰自动化设备有限公司', role: '买方', position: '待确认' },
    { id: 'actor-2', name: '浩达精密制造有限公司', role: '卖方', position: '待确认' },
  ],
  timeline: [],
  conflicts: [{ id: 'conflict-1', title: '设备采购履行争议', description: '双方对付款、交付和安装调试情况存在分歧。', actorIds: ['actor-1', 'actor-2'] }],
  unknowns: [{ id: 'unknown-1', question: '最终验收情况待确认', importance: 'high' as const }],
}

const facts = [
  { fact_id: 'fact-contract', matter_id: matterId, title: '双方签订设备采购合同', description: '合同载明设备规格和价款。', status: 'active', created_at: new Date('2026-01-01') },
  { fact_id: 'fact-payment', matter_id: matterId, title: '瑞峰公司支付设备采购款', description: '付款记录载明采购款支付情况。', status: 'active', created_at: new Date('2026-01-02') },
  { fact_id: 'fact-delivery', matter_id: matterId, title: '浩达公司开展设备交付及安装调试', description: '记录载明设备运抵现场并开展安装调试。', status: 'active', created_at: new Date('2026-01-03') },
]

const materials = [
  { material_id: 'material-contract', matter_id: matterId, title: '设备采购合同', material_type: 'contract', source: 'client', storage_uri: 'storage/intake-uploads/ruifeng/contract.txt' },
  { material_id: 'material-payment', matter_id: matterId, title: '付款记录', material_type: 'payment_record', source: 'client', storage_uri: 'storage/intake-uploads/ruifeng/payment.txt' },
  { material_id: 'material-delivery', matter_id: matterId, title: '安装调试记录', material_type: 'service_record', source: 'client', storage_uri: 'storage/intake-uploads/ruifeng/delivery.txt' },
]

const evidence = materials.map((material, index) => ({
  evidence_id: ['evidence-contract', 'evidence-payment', 'evidence-delivery'][index],
  matter_id: matterId,
  material_id: material.material_id,
  title: material.title,
  description: `${material.title}已由律师确认为正式证据。`,
  relevance: ['核验合同约定', '核验付款情况', '核验交付及安装调试情况'][index],
  evidence_type: material.material_type,
  status: 'active',
  material,
}))

const links = facts.map((fact, index) => ({
  fact_id: fact.fact_id,
  evidence_id: evidence[index].evidence_id,
  created_at: new Date(`2026-01-0${index + 1}`),
  evidence: evidence[index],
}))

function artifactStore() {
  return {
    createRun: vi.fn(async (_matterId, runId) => ({
      runId, directory: '/tmp/issue-understanding-test', inputUri: 'storage/context-engine-c0.5/input.json',
      rawResponseUri: 'storage/context-engine-c0.5/raw.json', resultUri: 'storage/context-engine-c0.5/result.json',
    })),
    saveInput: vi.fn(async () => undefined),
    saveRawResponse: vi.fn(async () => undefined),
    saveResult: vi.fn(async () => undefined),
  }
}

describe('Context Engine C0.5-A Issue Understanding', () => {
  it('uses Case Understanding, Formal Facts, Evidence and full Material text without lending pollution', async () => {
    const materialBodies: Record<string, string> = {
      'storage/intake-uploads/ruifeng/contract.txt': '设备采购合同载明自动化设备规格、合同价款及双方义务。',
      'storage/intake-uploads/ruifeng/payment.txt': '付款记录载明瑞峰公司向浩达公司支付设备采购款。',
      'storage/intake-uploads/ruifeng/delivery.txt': '安装调试记录载明设备运抵现场并开展安装调试。',
    }
    const aiDrafts = [
      { title: '设备采购合同约定内容如何认定', description: '需要结合合同记载审查设备规格、价款及双方义务。', source_fact_ids: ['fact-contract'], confidence: 0.92, ai_reasoning: '来源事实记载双方签订设备采购合同。' },
      { title: '已付款项与合同约定价款如何对应', description: '需要审查付款记录与合同价款约定之间的对应关系。', source_fact_ids: ['fact-contract', 'fact-payment'], confidence: 0.9, ai_reasoning: '合同事实和付款事实共同形成审查基础。' },
      { title: '设备交付及安装调试完成情况如何认定', description: '需要审查设备运抵、安装调试及后续验收情况。', source_fact_ids: ['fact-delivery'], confidence: 0.88, ai_reasoning: '交付及安装调试事实构成该问题的来源。' },
    ]
    const generate = vi.fn(async () => ({
      provider: 'minimax', model: 'MiniMax-M3',
      ai_audit: { provider: 'minimax', model: 'MiniMax-M3', prompt_version: 'issue-understanding-v1', fallback_used: false },
      response: { choices: [{ message: { content: JSON.stringify({ issue_drafts: aiDrafts }) } }] },
    }))
    const database = {
      matter: { findFirst: vi.fn() }, material: { findMany: vi.fn() },
      fact: { findMany: vi.fn(async () => facts) },
      factEvidence: { findMany: vi.fn(async () => links) },
      aiRecord: { create: vi.fn(async ({ data }) => data), update: vi.fn(async ({ data }) => data), updateMany: vi.fn(async () => ({ count: 0 })) },
    }
    const artifacts = artifactStore()
    const service = new IssueUnderstandingService(database as any, {
      caseUnderstandingReader: { latest: vi.fn(async () => ({ aiRecordId: 'cu-run', matterId, status: 'completed', model: 'MiniMax-M3', generatedAt: '', understanding })) },
      materialReader: { read: vi.fn(async (storageUri: string) => ({ storageUri, content: materialBodies[storageUri], contentLength: materialBodies[storageUri].length })) },
      generator: { generate }, artifactStore: artifacts,
    })

    const result = await service.generate(matterId)
    const prompt = generate.mock.calls[0][0].user_prompt

    expect(prompt).toContain('设备买卖合同纠纷')
    expect(prompt).toContain('双方签订设备采购合同')
    expect(prompt).toContain('evidence-contract')
    expect(prompt).toContain(materialBodies['storage/intake-uploads/ruifeng/contract.txt'])
    expect(prompt).toContain(materialBodies['storage/intake-uploads/ruifeng/payment.txt'])
    expect(prompt).toContain(materialBodies['storage/intake-uploads/ruifeng/delivery.txt'])
    expect(prompt).not.toMatch(/借款|借贷|本金|利息|还款/)
    expect(JSON.stringify(result.suggestions)).not.toMatch(/借款|借贷|本金|利息|还款/)
    expect(result.suggestions).toHaveLength(3)
    expect(artifacts.saveRawResponse).toHaveBeenCalled()
  })

  it('is used by IssueDraftService while preserving the existing Issue Draft DTO', async () => {
    const create = vi.fn(async ({ data }) => ({ id: 'issue-draft-row', ...data, created_at: new Date(), updated_at: new Date(), lawyer_note: null, published_issue_id: null, published_at: null }))
    const database = {
      issueDraft: { findMany: vi.fn(async () => []) },
      fact: { findMany: vi.fn(async () => facts) },
      factEvidence: { findMany: vi.fn(async () => links) },
      $transaction: vi.fn(async (callback) => callback({ issueDraft: { create } })),
    }
    const generation = {
      suggestions: [{ title: '已付款项与合同约定价款如何对应', description: '需要结合合同约定和付款事实进一步审查。', source_fact_ids: ['fact-contract', 'fact-payment'], confidence: 0.9, ai_reasoning: '两个正式事实共同形成审查基础。' }],
      aiAudit: { provider: 'minimax', model: 'MiniMax-M3', prompt_version: 'issue-understanding-v1', fallback_used: false },
    }
    const service = new IssueDraftService(database as any, () => ({ generate: vi.fn(async () => generation) }) as any)

    const result = await service.generateDrafts(matterId)

    expect(result.issue_drafts[0]).toEqual(expect.objectContaining({
      matter_id: matterId,
      title: '已付款项与合同约定价款如何对应',
      source_fact_ids: JSON.stringify(['fact-contract', 'fact-payment']),
      review_status: 'pending',
    }))
    expect(result.ai_audit?.prompt_version).toBe('issue-understanding-v1')
  })
})
