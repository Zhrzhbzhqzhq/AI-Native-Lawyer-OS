import { describe, expect, it } from 'vitest'
import ISSUE_PROMPT from '../src/prompts/research/issue_prompt'
import { findIssueBoundaryViolation, validateIssues } from '../src/services/ai/AIOutputValidator'
import { normalizeIssueSuggestionsForDrafts } from '../src/services/issueDraftService'

const facts = [
  { fact_id: 'fact-contract', matter_id: 'm', title: '双方签订设备采购合同', description: '双方签署设备采购合同。', status: 'active' },
  { fact_id: 'fact-delivery', matter_id: 'm', title: '设备已经交付并安装调试', description: '交付记录载明设备完成安装调试。', status: 'active' },
]

function issueCandidate(overrides: Record<string, unknown> = {}) {
  return {
    title: '设备交付与验收争议',
    description: '需要结合设备交付和安装调试事实审查履行状态。',
    fact_titles: ['设备已经交付并安装调试'],
    ai_reasoning: '交付记录反映设备已经交付并安装调试，但履行状态仍需律师审查。',
    confidence: 0.9,
    ...overrides,
  }
}

describe('M150.4 Issue Intelligence', () => {
  it('removes case-specific lending anchors and documents the Issue boundary', () => {
    expect(ISSUE_PROMPT).not.toMatch(/民间借贷|借款|借条|出借人|借款人|本金|利息/)
    expect(ISSUE_PROMPT).toContain('疑问式表达')
    expect(ISSUE_PROMPT).toContain('名词式争点表达')
    expect(ISSUE_PROMPT).toContain('fact_titles')
  })

  it('allows question-form and noun-form Issues', () => {
    expect(validateIssues([issueCandidate({ title: '设备是否完成合同约定的交付与验收' })]).ok).toBe(true)
    expect(validateIssues([issueCandidate({ title: '设备交付与验收争议' })]).ok).toBe(true)
    expect(validateIssues([issueCandidate({ title: '合同效力认定' })]).ok).toBe(true)
  })

  it('rejects direct legal conclusions without restricting title grammar', () => {
    for (const title of [
      '被告已经构成违约',
      '被告应当承担赔偿责任',
      '双方合同合法有效',
      '原告诉讼请求应予支持',
      '现有证据足以证明被告违约',
      '质量异议不能成立',
    ]) {
      expect(findIssueBoundaryViolation(title, '需要律师审查。')).toBeTruthy()
      expect(validateIssues([issueCandidate({ title })]).errors).toContain('issue[0] contains legal conclusion')
    }
  })

  it('requires exact Fact sources and an existing Fact to Evidence closure', () => {
    const closed = normalizeIssueSuggestionsForDrafts([issueCandidate()], facts, 5, new Set(['fact-delivery']))
    expect(closed.drafts).toHaveLength(1)
    expect(closed.drafts[0].source_fact_ids).toEqual(['fact-delivery'])

    const missingEvidence = normalizeIssueSuggestionsForDrafts([issueCandidate()], facts, 5, new Set(['fact-contract']))
    expect(missingEvidence.drafts).toEqual([])
    expect(missingEvidence.warnings).toContain('candidate_0:source_fact_without_evidence')

    const rewrittenTitle = normalizeIssueSuggestionsForDrafts([
      issueCandidate({ fact_titles: ['设备完成交付'] }),
    ], facts, 5, new Set(['fact-delivery']))
    expect(rewrittenTitle.drafts).toEqual([])
    expect(rewrittenTitle.warnings).toContain('candidate_0:invalid_source_fact_ids')
  })
})
