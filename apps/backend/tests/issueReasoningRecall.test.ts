import { describe, expect, it } from 'vitest'
import ISSUE_PROMPT from '../src/prompts/research/issue_prompt'
import { validateIssues } from '../src/services/ai/AIOutputValidator'
import { normalizeIssueSuggestionsForDrafts } from '../src/services/issueDraftService'

const facts = [
  { fact_id: 'fact-contract', matter_id: 'm', title: '采购合同签订及主体', description: '甲公司与乙公司签订设备采购合同。' },
  { fact_id: 'fact-delivery', matter_id: 'm', title: '设备交付与签收', description: '甲公司交付设备，乙公司签收。' },
  { fact_id: 'fact-acceptance', matter_id: 'm', title: '验收与使用记录', description: '设备完成安装调试并投入使用。' },
  { fact_id: 'fact-payment', matter_id: 'm', title: '付款情况', description: '付款流水记载乙公司支付部分款项。' },
  { fact_id: 'fact-reconcile', matter_id: 'm', title: '对账与催款', description: '双方进行对账，甲公司此后催款。' },
  { fact_id: 'fact-quality', matter_id: 'm', title: '设备质量异议', description: '乙公司提出设备质量异议，双方陈述存在矛盾。' },
]

const evidenceBackedFactIds = new Set(facts.map((fact) => fact.fact_id))

function candidate(overrides: Record<string, unknown>) {
  return {
    title: '履行状态争议',
    description: '需要结合所引事实审查履行状态。',
    fact_titles: ['设备交付与签收'],
    ai_reasoning: '所引事实反映履行状态仍需律师审查。',
    confidence: 0.9,
    ...overrides,
  }
}

describe('M150.4.1 Issue Reasoning Recall', () => {
  it('replays the four RuiFeng candidates while retaining unsupported-concept protection', () => {
    const result = normalizeIssueSuggestionsForDrafts([
      candidate({
        title: '设备质量异议的成立与否对货款支付主张的影响',
        description: '质量异议与验收记录可能存在矛盾，需要审查异议成立与否及其影响。',
        fact_titles: ['设备质量异议', '验收与使用记录'],
      }),
      candidate({
        title: '已交付设备的签收事实与合同约定交付义务履行情况',
        description: '需要结合设备签收事实与合同约定审查交付义务履行情况。',
        fact_titles: ['设备交付与签收', '采购合同签订及主体'],
      }),
      candidate({
        title: '已付货款金额与尚欠货款金额的认定',
        description: '需要核对付款与对账事实，并审查是否存在抵销情形。',
        fact_titles: ['付款情况', '对账与催款'],
      }),
      candidate({
        title: '验收记录的真实性与质量异议提出的时序问题',
        description: '需要结合验收使用记录与质量异议审查两者时序。',
        fact_titles: ['验收与使用记录', '设备质量异议'],
      }),
    ], facts, 5, evidenceBackedFactIds)

    expect(result.drafts.map((draft) => draft.title)).toEqual([
      '设备质量异议的成立与否对货款支付主张的影响',
      '已交付设备的签收事实与合同约定交付义务履行情况',
      '验收记录的真实性与质量异议提出的时序问题',
    ])
    expect(result.warnings).toContain('candidate_2:unsupported_concept:repayment_defense')
  })

  it('allows open 与否 expressions and rejects direct outcome conclusions', () => {
    for (const title of ['质量异议成立与否', '合同有效与否', '授权存在与否', '义务履行与否', '验收完成与否']) {
      expect(validateIssues([candidate({ title })]).ok).toBe(true)
    }

    for (const title of ['被告已经违约', '责任已经成立', '原告请求应予支持', '原告必然胜诉']) {
      expect(validateIssues([candidate({ title })]).errors).toContain('issue[0] contains legal conclusion')
    }
  })

  it('does not infer a legacy concept for an ordinary AI Issue', () => {
    const ordinary = normalizeIssueSuggestionsForDrafts([
      candidate({
        title: '设备交付与合同履行情况',
        fact_titles: ['设备交付与签收', '采购合同签订及主体'],
      }),
    ], facts, 5, evidenceBackedFactIds)
    expect(ordinary.drafts).toHaveLength(1)
    expect(ordinary.warnings.some((warning) => warning.includes('source_fact_concept_mismatch'))).toBe(false)

    const explicitLegacyMismatch = normalizeIssueSuggestionsForDrafts([
      candidate({ issue_type: 'agreement', fact_titles: ['设备交付与签收'] }),
    ], facts, 5, evidenceBackedFactIds)
    expect(explicitLegacyMismatch.drafts).toEqual([])
    expect(explicitLegacyMismatch.warnings).toContain('candidate_0:source_fact_concept_mismatch:agreement')
  })

  it('continues rejecting unsupported offset, third-party, and guarantee concepts', () => {
    const result = normalizeIssueSuggestionsForDrafts([
      candidate({ title: '抵销抗辩争议', description: '需要审查是否已经抵销。', fact_titles: ['付款情况'] }),
      candidate({ title: '第三人代付争议', description: '需要审查第三人是否代付。', fact_titles: ['付款情况'] }),
      candidate({ title: '保证责任争议', description: '需要审查保证人是否承担保证责任。', fact_titles: ['采购合同签订及主体'] }),
    ], facts, 5, evidenceBackedFactIds)

    expect(result.drafts).toEqual([])
    expect(result.warnings).toContain('candidate_0:unsupported_concept:repayment_defense')
    expect(result.warnings).toContain('candidate_1:unsupported_concept:third_party')
    expect(result.warnings).toContain('candidate_2:unsupported_concept:guarantee')
  })

  it('keeps exact Fact matching and the Fact to Evidence closure', () => {
    const exact = candidate({ fact_titles: ['设备交付与签收'] })
    expect(normalizeIssueSuggestionsForDrafts([exact], facts, 5, evidenceBackedFactIds).drafts).toHaveLength(1)

    const rewritten = candidate({ fact_titles: ['设备已经完成交付'] })
    expect(normalizeIssueSuggestionsForDrafts([rewritten], facts, 5, evidenceBackedFactIds).warnings).toContain('candidate_0:invalid_source_fact_ids')

    const missingEvidence = normalizeIssueSuggestionsForDrafts([exact], facts, 5, new Set(['fact-contract']))
    expect(missingEvidence.drafts).toEqual([])
    expect(missingEvidence.warnings).toContain('candidate_0:source_fact_without_evidence')
  })

  it('documents that hypothetical defenses, responsibility subjects, and legal relationships cannot be added', () => {
    expect(ISSUE_PROMPT).toContain('不得枚举输入 Facts 未出现的假设性抗辩')
    expect(ISSUE_PROMPT).toContain('不得补充输入 Facts 中不存在的责任主体或法律关系')
  })
})
