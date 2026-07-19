import { describe, expect, it } from 'vitest'
import LAW_PROMPT from '../src/prompts/research/law_prompt'
import { buildLawPrompt } from '../src/services/ai/AIPromptTemplates'
import { findLawBoundaryViolation, findLawCitationViolation, validateLaws } from '../src/services/ai/AIOutputValidator'
import { assertFormalLawContent, normalizeLawSuggestionsForDrafts } from '../src/services/lawDraftService'

const issues = [{
  issue_id: 'issue-performance',
  title: '合同履行范围认定',
  description: '需要审查合同约定义务及履行情况。',
  facts: [{ fact: { fact_id: 'fact-performance', title: '合同约定义务已经部分履行' } }],
}]

function lawCandidate(overrides: Record<string, unknown> = {}) {
  return {
    title: '合同全面履行规则',
    citation: '《中华人民共和国民法典》第五百零九条',
    rule_content: '当事人应当按照约定全面履行自己的义务。',
    application: '该规则用于审查对应争议焦点中的合同义务及履行范围。',
    limitations: '需要结合合同约定、履行期限和实际履行情况核验。',
    source_reference: '',
    issue_title: '合同履行范围认定',
    confidence: 0.9,
    ...overrides,
  }
}

describe('M150.5 Law Intelligence', () => {
  it('removes case-specific anchors and forced Law coverage', () => {
    expect(LAW_PROMPT).not.toMatch(/民间借贷|借款|借条|出借人|借款人|本金|利息|指导案例\s*XX/)
    expect(LAW_PROMPT).toContain('不要求为每一个 Issue 强制生成 Law')

    const prompt = buildLawPrompt({ matter: {}, facts: [], issues, evidence: [], materials: [] })
    expect(prompt).toContain('rule_content')
    expect(prompt).toContain('application')
    expect(prompt).toContain('limitations')
    expect(prompt).not.toContain('每个争议焦点至少返回一条')
    expect(prompt).not.toContain('支持结论')
  })

  it('validates separated Law fields and citation format without claiming legal authenticity', () => {
    expect(validateLaws([lawCandidate()]).ok).toBe(true)
    expect(validateLaws([lawCandidate({ application: '' })]).errors).toContain('law[0].application missing or empty')
    expect(findLawCitationViolation('《中华人民共和国民法典》第X条')).toBeTruthy()
    expect(findLawCitationViolation('相关规定')).toBeTruthy()
    expect(findLawCitationViolation('《中华人民共和国民法典》第五百零九条')).toBeNull()
  })

  it('allows abstract rules but rejects final case conclusions', () => {
    expect(findLawBoundaryViolation('当事人不履行合同义务的，应当依法承担违约责任。')).toBeNull()
    for (const application of [
      '本案被告已经构成违约并应当承担赔偿责任。',
      '原告诉讼请求应予支持。',
      '现有证据足以证明被告承担责任。',
      '被告抗辩不能成立。',
    ]) {
      expect(findLawBoundaryViolation(application)).toBeTruthy()
      expect(validateLaws([lawCandidate({ application })]).errors).toContain('law[0] contains final case conclusion')
    }
  })

  it('keeps one exact Issue source, requires the upstream closure, and never defaults to agreement', () => {
    const normalized = normalizeLawSuggestionsForDrafts([
      lawCandidate({ source_issue_ids: ['issue-performance'] }),
    ], issues, new Set(['issue-performance']))
    expect(normalized).toHaveLength(1)
    expect(normalized[0].source_issue_ids).toEqual(['issue-performance'])
    expect(normalized[0].issue_type).toBe('general')

    expect(normalizeLawSuggestionsForDrafts([
      lawCandidate({ source_issue_ids: ['issue-performance'] }),
    ], issues, new Set())).toEqual([])

    expect(normalizeLawSuggestionsForDrafts([
      lawCandidate({ issue_title: '改写后的争议焦点' }),
    ], issues, new Set(['issue-performance']))).toEqual([])
  })

  it('rechecks citation and final-conclusion safety before formal publication', () => {
    expect(() => assertFormalLawContent(lawCandidate())).not.toThrow()
    expect(() => assertFormalLawContent(lawCandidate({ citation: '《中华人民共和国民法典》第Y条' }))).toThrow('unsafe_formal_law_content')
    expect(() => assertFormalLawContent(lawCandidate({ application: '本案被告应当支付全部款项。' }))).toThrow('law_contains_final_case_conclusion')
  })
})
