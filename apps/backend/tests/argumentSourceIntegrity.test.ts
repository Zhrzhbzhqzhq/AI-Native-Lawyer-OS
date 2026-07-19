import { describe, expect, it, vi } from 'vitest'
import { buildArgumentPrompt } from '../src/services/ai/AIPromptTemplates'
import { normalizeArgumentSuggestionsForDrafts } from '../src/services/argumentDraftService'

const argumentContent = {
  title: '争点A的阶段性论证',
  issue_title: '争点A',
  position: '基于当前来源形成阶段性观点。',
  reasoning: '事实与法律规则共同构成当前论证基础。',
  counter_argument: '对方可能提出不同解释。',
  response: '应结合当前来源逐项回应。',
  risk: '事实认定和法律适用仍需律师审核。',
  conclusion: '现有来源支持阶段性观点，最终结论仍待律师审核。',
}

function sourceGraph() {
  const facts = [
    { fact_id: 'fact-a', title: '事实A' },
    { fact_id: 'fact-b', title: '事实B' },
  ]
  const issues = [
    { issue_id: 'issue-a', title: '争点A', facts: [{ fact: facts[0] }] },
    { issue_id: 'issue-b', title: '争点B', facts: [{ fact: facts[1] }] },
  ]
  const laws = [
    { law_id: 'law-a', title: '规则A', citation: '法条A', issues: [{ issue_id: 'issue-a' }] },
    { law_id: 'law-b', title: '规则B', citation: '法条B', issues: [{ issue_id: 'issue-b' }] },
  ]
  return { facts, issues, laws }
}

describe('M150.6.2 Argument Source Integrity', () => {
  it('renders Issue-scoped Facts and Laws instead of three global lists', () => {
    const prompt = buildArgumentPrompt({
      argumentScopes: [
        {
          issue_title: '争点A',
          allowed_facts: [{ title: '事实A' }],
          allowed_laws: [{ title: '规则A', citation: '法条A' }],
        },
        {
          issue_title: '争点B',
          allowed_facts: [{ title: '事实B' }],
          allowed_laws: [{ title: '规则B', citation: '法条B' }],
        },
      ],
      facts: [{ title: '不应进入Prompt的全量事实' }],
      issues: [{ title: '不应进入Prompt的全量争点' }],
      laws: [{ citation: '不应进入Prompt的全量法条' }],
    })

    expect(prompt).toContain('Argument Scopes')
    expect(prompt).toContain('争点A')
    expect(prompt).toContain('事实A')
    expect(prompt).toContain('法条A')
    expect(prompt).not.toContain('不应进入Prompt的全量事实')
    expect(prompt).not.toContain('不应进入Prompt的全量争点')
    expect(prompt).not.toContain('不应进入Prompt的全量法条')
  })

  it('accepts a source-complete Argument for one Issue', () => {
    const { facts, issues, laws } = sourceGraph()
    const drafts = normalizeArgumentSuggestionsForDrafts([{
      ...argumentContent,
      fact_titles: ['事实A'],
      law_citations: ['法条A'],
    }], facts, issues, laws, new Set(['fact-a', 'fact-b']))

    expect(drafts).toHaveLength(1)
    expect(drafts[0].source_issue_ids).toEqual(['issue-a'])
    expect(drafts[0].source_fact_ids).toEqual(['fact-a'])
    expect(drafts[0].source_law_ids).toEqual(['law-a'])
  })

  it('rejects the whole candidate when any Fact belongs to another Issue', () => {
    const { facts, issues, laws } = sourceGraph()
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const drafts = normalizeArgumentSuggestionsForDrafts([{
      ...argumentContent,
      fact_titles: ['事实A', '事实B'],
      law_citations: ['法条A'],
    }], facts, issues, laws, new Set(['fact-a', 'fact-b']))

    expect(drafts).toEqual([])
    expect(log).toHaveBeenCalledWith('[ARGUMENT FILTER REJECT]', expect.objectContaining({
      reason: 'source_fact_outside_issue',
    }))
    log.mockRestore()
  })

  it('rejects a Law from another Issue', () => {
    const { facts, issues, laws } = sourceGraph()
    expect(normalizeArgumentSuggestionsForDrafts([{
      ...argumentContent,
      fact_titles: ['事实A'],
      law_citations: ['法条B'],
    }], facts, issues, laws, new Set(['fact-a', 'fact-b']))).toEqual([])
  })

  it('rejects an Argument that explicitly names multiple Issues', () => {
    const { facts, issues, laws } = sourceGraph()
    expect(normalizeArgumentSuggestionsForDrafts([{
      ...argumentContent,
      source_issue_ids: ['issue-a', 'issue-b'],
      source_fact_ids: ['fact-a'],
      source_law_ids: ['law-a'],
    }], facts, issues, laws, new Set(['fact-a', 'fact-b']))).toEqual([])
  })
})
