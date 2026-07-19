import { describe, expect, it, vi } from 'vitest'
import DocumentGenerationService, {
  buildDocumentReasoningScope,
  renderComplaintSections,
  type ComplaintSections,
} from '../src/services/ai/DocumentGenerationService'
import { buildDocumentContext } from '../src/services/documentDraftService'
import { serializeFormalArgumentV2, serializeFormalLawV2 } from '../src/services/formalSemanticCodec'
import { validateComplaintSections } from '../src/services/ai/AIOutputValidator'

export function reasoningContext() {
  return buildDocumentContext({
    matter_id: 'matter-1', document_type: 'complaint', lawyer_instruction: '保持审慎表达',
    matter: { matter_id: 'matter-1', title: '合同履行争议', description: '双方对履行范围有争议。' },
    evidences: [{ evidence_id: 'evidence-1', matter_id: 'matter-1', title: '合同文本证据', description: '证明合同记载内容。', status: 'active', material: null }],
    facts: [{ fact_id: 'fact-1', matter_id: 'matter-1', title: '双方签署合同', description: '2025年1月2日双方签署合同。', status: 'active' }],
    issues: [{ issue_id: 'issue-1', matter_id: 'matter-1', title: '合同义务履行范围', description: '履行范围如何确定。', status: 'active' }],
    laws: [{ law_id: 'law-1', matter_id: 'matter-1', title: '合同履行规则', citation: '《中华人民共和国民法典》第五百零九条', status: 'active', description: serializeFormalLawV2({ rule_content: '当事人应按约履行义务。', application: '结合确认事实审查。', limitations: '仍需核对合同全文。', jurisdiction: '中国大陆', source_reference: '正式法源' }) }],
    argumentsList: [{ argument_id: 'argument-1', matter_id: 'matter-1', issue_id: 'issue-1', title: '按约履行主张', conclusion: '可提出履行主张。', status: 'active', description: serializeFormalArgumentV2({ position: '应按约确定履行范围。', reasoning: '合同文本支持该主张。', counter_argument: '对方可能否认合同含义。', response: '应以合同原文回应。', risk: '原件仍需核对。' }) }],
    factEvidenceLinks: [{ fact_id: 'fact-1', evidence_id: 'evidence-1' }],
    issueFactLinks: [{ issue_id: 'issue-1', fact_id: 'fact-1' }],
    lawIssueLinks: [{ law_id: 'law-1', issue_id: 'issue-1' }],
    argumentFactLinks: [{ argument_id: 'argument-1', fact_id: 'fact-1' }],
    argumentIssueLinks: [{ argument_id: 'argument-1', issue_id: 'issue-1' }],
    argumentLawLinks: [{ argument_id: 'argument-1', law_id: 'law-1' }],
  } as any)
}

export function validSections(): ComplaintSections {
  return {
    document_type: 'complaint', title: '民事起诉状',
    parties: { plaintiff: '【待律师补充】', defendant: '【待律师补充】' },
    claims: [{ text: '【待律师根据已确认 Argument 和案件目标补充】', source_argument_ids: [], source_fact_ids: [], requires_lawyer_confirmation: true }],
    facts: [{ text: '2025年1月2日双方签署合同。', source_fact_ids: ['fact-1'], source_evidence_ids: ['evidence-1'] }],
    reasoning: [{ issue_id: 'issue-1', argument_id: 'argument-1', position: '应按约确定履行范围。', analysis: '合同文本支持该主张。', source_fact_ids: ['fact-1'], source_law_ids: ['law-1'] }],
    legal_basis: [{ citation: '《中华人民共和国民法典》第五百零九条', text: '当事人应按约履行义务。', source_law_id: 'law-1' }],
    evidence_reference: [{ evidence_id: 'evidence-1', title: '合同文本证据', purpose: '证明合同记载内容。' }],
    conclusion: '具体请求由律师审核。', court: '【待律师补充：受理法院】', signature: '【待律师补充】', date: '【待律师补充】',
  }
}

describe('DocumentGenerationService', () => {
  it('builds an immutable reasoning scope from valid Formal Argument scopes only', () => {
    const scope = buildDocumentReasoningScope(reasoningContext())
    expect(scope.argument_sections).toHaveLength(1)
    expect(scope.argument_sections[0]).toMatchObject({
      position: '应按约确定履行范围。', reasoning: '合同文本支持该主张。',
      response: '应以合同原文回应。', conclusion: '可提出履行主张。',
    })
    expect(scope.argument_sections[0].internal_constraints).toMatchObject({ counter_argument: '对方可能否认合同含义。', risk: '原件仍需核对。' })
    expect(JSON.stringify(scope)).not.toContain('LAWDESK_FORMAL_')
  })

  it('returns validated sections and passes a scope-only prompt', async () => {
    const generator = { generate: vi.fn().mockResolvedValue({ response: validSections(), finish_reason: 'stop' }) }
    const scope = buildDocumentReasoningScope(reasoningContext())
    const result = await new DocumentGenerationService(generator).generate('matter-1', scope)
    expect(result).toMatchObject({ ok: true, mode: 'ai_generated', attempts: 1 })
    const pack = generator.generate.mock.calls[0][0]
    expect(pack.max_completion_tokens).toBe(6000)
    expect(pack.context_pack).toBe(scope)
    expect(pack.user_prompt).toContain('只能使用 argument_sections')
    expect(pack.user_prompt).not.toContain('LAWDESK_FORMAL_')
  })

  it.each([
    ['length', { response: validSections(), finish_reason: 'length' }],
    ['max_tokens', { response: validSections(), stop_reason: 'max_tokens' }],
    ['invalid json', { response: { choices: [{ message: { content: '{bad' } }] }, finish_reason: 'stop' }],
    ['source violation', { response: { ...validSections(), facts: [{ text: '越界事实', source_fact_ids: ['fact-x'], source_evidence_ids: ['evidence-1'] }] }, finish_reason: 'stop' }],
  ])('retries once after %s and preserves the identical scope', async (_label, first) => {
    const generator = { generate: vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce({ response: validSections(), finish_reason: 'stop' }) }
    const scope = buildDocumentReasoningScope(reasoningContext())
    const result = await new DocumentGenerationService(generator).generate('matter-1', scope)
    expect(result).toMatchObject({ ok: true, mode: 'ai_retry_generated', attempts: 2 })
    expect(generator.generate.mock.calls[0][0].context_pack).toBe(scope)
    expect(generator.generate.mock.calls[1][0].context_pack).toBe(scope)
    expect(generator.generate.mock.calls[1][0].user_prompt).toContain('紧凑重试')
  })

  it('discards both invalid outputs and returns a controlled failure', async () => {
    const generator = { generate: vi.fn().mockResolvedValue({ response: 'not-json', finish_reason: 'stop' }) }
    const result = await new DocumentGenerationService(generator).generate('matter-1', buildDocumentReasoningScope(reasoningContext()))
    expect(result).toMatchObject({ ok: false, attempts: 2, reason: 'document_json_parse_failed' })
  })

  it('renders a complaint without ids or internal constraints', () => {
    const content = renderComplaintSections(validSections())
    expect(content).toContain('民事起诉状')
    expect(content).toContain('【待律师确认】')
    expect(content).not.toMatch(/fact-1|law-1|argument-1|evidence-1/)
    expect(content).not.toContain('风险')
    expect(content).not.toContain('对方可能否认')
  })

  it.each([
    ['new fact id', (value: any) => { value.facts[0].source_fact_ids = ['fact-x'] }],
    ['new law id', (value: any) => { value.legal_basis[0].source_law_id = 'law-x' }],
    ['new evidence id', (value: any) => { value.evidence_reference[0].evidence_id = 'evidence-x' }],
    ['new citation', (value: any) => { value.legal_basis[0].citation = '《虚构法律》第一条' }],
    ['new amount', (value: any) => { value.facts[0].text += '金额为999999元。' }],
    ['new date', (value: any) => { value.facts[0].text += '另于2030年2月3日履行。' }],
    ['absolute outcome', (value: any) => { value.reasoning[0].analysis = '法院一定支持。' }],
    ['risk leakage', (value: any) => { value.reasoning[0].analysis = '原件仍需核对。' }],
  ])('rejects deterministic boundary violation: %s', (_label, mutate) => {
    const sections: any = structuredClone(validSections())
    mutate(sections)
    expect(validateComplaintSections(sections, buildDocumentReasoningScope(reasoningContext())).ok).toBe(false)
  })
})
