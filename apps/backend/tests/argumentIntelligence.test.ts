import { describe, expect, it } from 'vitest'
import { buildArgumentPrompt } from '../src/services/ai/AIPromptTemplates'
import { findArgumentBoundaryViolation, validateArguments } from '../src/services/ai/AIOutputValidator'
import { normalizeArgumentSuggestionsForDrafts } from '../src/services/argumentDraftService'

const content = {
  position: '基于当前来源，可以提出该项阶段性法律观点。',
  reasoning: '已确认事实与适用规则共同构成现阶段论证基础。',
  counter_argument: '对方可能提出不同的事实或法律解释。',
  response: '应结合现有来源对相反观点逐项回应。',
  risk: '事实认定和法律适用仍需律师审核。',
  conclusion: '现有来源可支持该阶段性观点，仍需律师审核。',
}

function sources() {
  const facts = [
    { fact_id: 'fact-a', title: '事实A' },
    { fact_id: 'fact-b', title: '事实B' },
    { fact_id: 'fact-unlinked', title: '同一案件但未关联争点的事实' },
  ]
  const issues = [
    { issue_id: 'issue-a', title: '争点A', facts: [{ fact: facts[0] }] },
    { issue_id: 'issue-b', title: '争点B', facts: [{ fact: facts[1] }] },
  ]
  const laws = [
    { law_id: 'law-a', citation: '《测试法》第一条', issues: [{ issue_id: 'issue-a' }] },
    { law_id: 'law-b', citation: '《测试法》第二条', issues: [{ issue_id: 'issue-b' }] },
  ]
  return { facts, issues, laws }
}

describe('M150.6 Argument Intelligence', () => {
  it('builds a generic prompt with the complete Argument fields and real sources', () => {
    const prompt = buildArgumentPrompt({
      argumentScopes: [{
        issue_title: '输入争点',
        allowed_facts: [{ title: '输入事实' }],
        allowed_laws: [{ citation: '《测试法》第一条' }],
      }],
    })
    expect(prompt).toContain('输入事实')
    expect(prompt).toContain('输入争点')
    expect(prompt).toContain('《测试法》第一条')
    for (const field of ['position', 'reasoning', 'counter_argument', 'response', 'risk']) {
      expect(prompt).toContain(`'${field}'`)
    }
    expect(prompt).toMatch(/禁止宣称必然胜诉或败诉/)
  })

  it('allows provisional legal positions and rejects outcome guarantees', () => {
    const candidate = {
      title: '阶段性法律论证',
      issue_title: '争点A',
      fact_titles: ['事实A'],
      law_citations: ['《测试法》第一条'],
      ...content,
    }
    expect(validateArguments([candidate])).toEqual({ ok: true, errors: [] })
    expect(findArgumentBoundaryViolation('本案必然胜诉')).toBeTruthy()
    expect(validateArguments([{ ...candidate, conclusion: '法院一定支持全部诉讼请求。' }]).ok).toBe(false)
  })

  it('keeps one Argument per Issue without issue-type merging', () => {
    const { facts, issues, laws } = sources()
    const drafts = normalizeArgumentSuggestionsForDrafts([
      { title: '论证A', issue_title: '争点A', fact_titles: ['事实A'], law_citations: ['《测试法》第一条'], ...content },
      { title: '论证B', issue_title: '争点B', fact_titles: ['事实B'], law_citations: ['《测试法》第二条'], ...content },
    ], facts, issues, laws, new Set(['fact-a', 'fact-b']))
    expect(drafts).toHaveLength(2)
    expect(drafts.map((draft) => draft.source_issue_ids)).toEqual([['issue-a'], ['issue-b']])
  })

  it('requires Argument to Issue to Fact to Evidence and Argument to Law to Issue closure', () => {
    const { facts, issues, laws } = sources()
    const normalize = (candidate: Record<string, unknown>, evidenceFactIds = new Set(['fact-a'])) => (
      normalizeArgumentSuggestionsForDrafts([{ title: '论证', ...content, ...candidate }], facts, issues, laws, evidenceFactIds)
    )

    expect(normalize({ source_issue_ids: ['issue-a'], source_fact_ids: ['fact-a'], source_law_ids: ['law-a'] })).toHaveLength(1)
    expect(normalize({ source_issue_ids: ['issue-a', 'issue-b'], source_fact_ids: ['fact-a'], source_law_ids: ['law-a'] })).toEqual([])
    expect(normalize({ source_issue_ids: ['issue-a'], source_fact_ids: ['fact-unlinked'], source_law_ids: ['law-a'] }, new Set(['fact-unlinked']))).toEqual([])
    expect(normalize({ source_issue_ids: ['issue-a'], source_fact_ids: ['fact-a'], source_law_ids: ['law-a'] }, new Set())).toEqual([])
    expect(normalize({ source_issue_ids: ['issue-a'], source_fact_ids: ['fact-a'], source_law_ids: ['law-b'] })).toEqual([])
  })
})
