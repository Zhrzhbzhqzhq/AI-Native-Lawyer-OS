import { describe, expect, it, vi } from 'vitest'
import LawDraftService from '../../src/services/lawDraftService'
import LawUnderstandingService from '../../src/services/context_engine/law_understanding_service'

const matterId = 'matter-ruifeng-haoda'

const understanding = {
  identity: { title: '瑞峰自动化设备有限公司与浩达精密制造有限公司设备采购纠纷', caseType: '设备买卖合同纠纷', stage: '诉前', jurisdiction: '中国大陆' },
  narrative: { summary: '双方围绕设备采购、付款、交付和安装调试发生争议。', background: '双方存在设备采购交易。', currentPosture: '待律师审查法律依据。' },
  actors: [
    { id: 'actor-1', name: '瑞峰自动化设备有限公司', role: '买方', position: '待确认' },
    { id: 'actor-2', name: '浩达精密制造有限公司', role: '卖方', position: '待确认' },
  ],
  timeline: [],
  conflicts: [{ id: 'conflict-1', title: '设备采购履行争议', description: '双方对付款、交付和安装调试情况存在分歧。', actorIds: ['actor-1', 'actor-2'] }],
  unknowns: [{ id: 'unknown-1', question: '最终验收情况待确认', importance: 'high' as const }],
}

const facts = [
  { fact_id: 'fact-contract', matter_id: matterId, title: '双方签订设备采购合同', description: '合同载明设备规格和价款。', status: 'active' },
  { fact_id: 'fact-payment', matter_id: matterId, title: '瑞峰公司支付设备采购款', description: '付款记录载明采购款支付情况。', status: 'active' },
  { fact_id: 'fact-delivery', matter_id: matterId, title: '浩达公司开展设备交付及安装调试', description: '记录载明设备运抵现场并开展安装调试。', status: 'active' },
]

const issue = {
  issue_id: 'issue-performance', matter_id: matterId, title: '设备采购合同履行范围如何审查',
  description: '需要结合合同、付款、交付和安装调试事实审查双方履行范围。', priority: 'high', status: 'active', created_at: new Date('2026-01-04'),
  facts: facts.map((fact) => ({ fact_id: fact.fact_id, fact })),
}

const materials = [
  { material_id: 'material-contract', matter_id: matterId, title: '设备采购合同', material_type: 'contract', source: 'client', storage_uri: 'storage/intake-uploads/ruifeng/contract.txt' },
  { material_id: 'material-payment', matter_id: matterId, title: '付款记录', material_type: 'payment_record', source: 'client', storage_uri: 'storage/intake-uploads/ruifeng/payment.txt' },
  { material_id: 'material-delivery', matter_id: matterId, title: '安装调试记录', material_type: 'service_record', source: 'client', storage_uri: 'storage/intake-uploads/ruifeng/delivery.txt' },
]

const evidences = materials.map((material, index) => ({
  evidence_id: ['evidence-contract', 'evidence-payment', 'evidence-delivery'][index], matter_id: matterId,
  material_id: material.material_id, title: material.title, description: `${material.title}正式证据`,
  relevance: ['核验合同约定', '核验付款情况', '核验交付及安装调试情况'][index],
  evidence_type: material.material_type, status: 'active', material,
}))

const links = facts.map((fact, index) => ({
  fact_id: fact.fact_id, evidence_id: evidences[index].evidence_id, created_at: new Date(`2026-01-0${index + 1}`), evidence: evidences[index],
}))

function artifactStore() {
  return {
    createRun: vi.fn(async (_matterId, runId) => ({
      runId, directory: '/tmp/law-understanding-test', inputUri: 'storage/context-engine-c0.6/input.json',
      rawResponseUri: 'storage/context-engine-c0.6/raw.json', resultUri: 'storage/context-engine-c0.6/result.json',
    })),
    saveInput: vi.fn(async () => undefined), saveRawResponse: vi.fn(async () => undefined), saveResult: vi.fn(async () => undefined),
  }
}

describe('Context Engine C0.6-B Law Understanding', () => {
  it('builds a complete equipment-sale Issue Scope and excludes lending and rejected data', async () => {
    const rejectedFact = { fact_id: 'fact-rejected', matter_id: matterId, title: '被拒绝的错误事实', description: '不应进入 Prompt', status: 'rejected' }
    const rejectedIssue = { ...issue, issue_id: 'issue-rejected', title: '被拒绝的错误争点', status: 'rejected', facts: [{ fact_id: rejectedFact.fact_id, fact: rejectedFact }] }
    const rejectedEvidence = { ...evidences[0], evidence_id: 'evidence-rejected', title: '被拒绝的错误证据', status: 'rejected' }
    const materialBodies: Record<string, string> = {
      'storage/intake-uploads/ruifeng/contract.txt': '设备采购合同载明自动化设备规格、合同价款及双方履行义务。',
      'storage/intake-uploads/ruifeng/payment.txt': '付款记录载明瑞峰公司向浩达公司支付设备采购款。',
      'storage/intake-uploads/ruifeng/delivery.txt': '安装调试记录载明设备运抵现场并开展安装调试。',
    }
    const lawDraft = {
      title: '合同全面履行规则', citation: '《中华人民共和国民法典》第五百零九条',
      rule_content: '当事人应当按照约定全面履行自己的义务。',
      application: '该规则用于审查设备采购合同约定义务、付款、交付及安装调试的履行范围。',
      limitations: '需要结合合同具体约定、履行期限及材料记载进一步核验。', jurisdiction: '中国大陆',
      source_reference: '《中华人民共和国民法典》', confidence: 0.93,
      ai_reasoning: '该规则与设备采购合同履行范围争点及其来源事实直接相关。', source_issue_ids: ['issue-performance'],
    }
    const generate = vi.fn(async () => ({
      provider: 'minimax', model: 'MiniMax-M3',
      ai_audit: { provider: 'minimax', model: 'MiniMax-M3', prompt_version: 'law-understanding-v1', fallback_used: false },
      response: { choices: [{ message: { content: JSON.stringify({ law_drafts: [lawDraft] }) } }] },
    }))
    const database = {
      matter: { findFirst: vi.fn() }, material: { findMany: vi.fn() },
      issue: { findMany: vi.fn(async () => [issue, rejectedIssue]) },
      factEvidence: { findMany: vi.fn(async () => [...links, { fact_id: 'fact-contract', evidence: rejectedEvidence }]) },
      aiRecord: { create: vi.fn(async ({ data }) => data), update: vi.fn(async ({ data }) => data), updateMany: vi.fn(async () => ({ count: 0 })) },
    }
    const artifacts = artifactStore()
    const service = new LawUnderstandingService(database as any, {
      caseUnderstandingReader: { latest: vi.fn(async () => ({ aiRecordId: 'cu-run', matterId, status: 'completed', model: 'MiniMax-M3', generatedAt: '', understanding })) },
      materialReader: { read: vi.fn(async (storageUri: string) => ({ storageUri, content: materialBodies[storageUri], contentLength: materialBodies[storageUri].length })) },
      generator: { generate }, artifactStore: artifacts,
    })

    const result = await service.generate(matterId)
    const prompt = generate.mock.calls[0][0].user_prompt

    expect(prompt).toContain('设备买卖合同纠纷')
    expect(prompt).toContain('issue-performance')
    expect(prompt).toContain('fact-contract')
    expect(prompt).toContain('evidence-contract')
    expect(prompt).toContain(materialBodies['storage/intake-uploads/ruifeng/contract.txt'])
    expect(prompt).toContain(materialBodies['storage/intake-uploads/ruifeng/payment.txt'])
    expect(prompt).toContain(materialBodies['storage/intake-uploads/ruifeng/delivery.txt'])
    expect(prompt).not.toContain('issue-rejected')
    expect(prompt).not.toContain('fact-rejected')
    expect(prompt).not.toContain('evidence-rejected')
    expect(prompt).not.toMatch(/借款|借贷|本金|利息|还款/)
    expect(JSON.stringify(result.suggestions)).not.toMatch(/借款|借贷|本金|利息|还款/)
    expect(result.suggestions[0].source_issue_ids).toEqual(['issue-performance'])
    expect(artifacts.saveRawResponse).toHaveBeenCalled()
  })

  it('is used by LawDraftService while preserving normalize and the existing Law Draft DTO', async () => {
    const lawDraft = {
      title: '合同全面履行规则', citation: '《中华人民共和国民法典》第五百零九条',
      rule_content: '当事人应当按照约定全面履行自己的义务。', application: '该规则用于审查设备采购合同履行范围。',
      limitations: '需要结合合同约定和实际履行情况核验。', jurisdiction: '中国大陆', source_reference: '《中华人民共和国民法典》',
      confidence: 0.93, ai_reasoning: '对应设备采购合同履行范围争点。', source_issue_ids: ['issue-performance'],
    }
    const create = vi.fn(async ({ data }) => ({ id: 'law-draft-row', ...data, created_at: new Date(), updated_at: new Date(), lawyer_note: null, published_law_id: null, published_at: null }))
    const database = {
      lawDraft: { findMany: vi.fn(async () => []) }, issue: { findMany: vi.fn(async () => [issue]) },
      factEvidence: { findMany: vi.fn(async () => links) },
      $transaction: vi.fn(async (callback) => callback({ lawDraft: { create } })),
    }
    const generation = {
      suggestions: [lawDraft],
      aiAudit: { provider: 'minimax', model: 'MiniMax-M3', prompt_version: 'law-understanding-v1', fallback_used: false },
    }
    const service = new LawDraftService(database as any, () => ({ generate: vi.fn(async () => generation) }) as any)

    const result = await service.generateDrafts(matterId)

    expect(result.law_drafts[0]).toEqual(expect.objectContaining({
      matter_id: matterId, title: '合同全面履行规则', citation: '《中华人民共和国民法典》第五百零九条',
      source_issue_ids: ['issue-performance'], review_status: 'pending',
    }))
    expect(result.ai_audit?.prompt_version).toBe('law-understanding-v1')
  })
})
