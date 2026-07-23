import { describe, expect, it, vi } from 'vitest'
import DocumentDraftService, { buildDocumentContext } from '../src/services/documentDraftService'
import DocumentGenerationService, { type ComplaintSections } from '../src/services/ai/DocumentGenerationService'
import { serializeFormalArgumentV2, serializeFormalLawV2 } from '../src/services/formalSemanticCodec'

function reasoningContext() {
  return buildDocumentContext({
    matter_id: 'matter-1', document_type: 'complaint', lawyer_instruction: '',
    matter: { matter_id: 'matter-1', title: '合同履行争议', description: '双方对履行范围有争议。' },
    evidences: [{ evidence_id: 'evidence-1', matter_id: 'matter-1', title: '合同文本证据', description: '证明合同记载内容。', status: 'active', material: null }],
    facts: [{ fact_id: 'fact-1', matter_id: 'matter-1', title: '双方签署合同', description: '2025年1月2日双方签署合同。', status: 'active' }],
    issues: [{ issue_id: 'issue-1', matter_id: 'matter-1', title: '合同义务履行范围', description: '履行范围如何确定。', status: 'active' }],
    laws: [{ law_id: 'law-1', matter_id: 'matter-1', title: '合同履行规则', citation: '《中华人民共和国民法典》第五百零九条', status: 'active', description: serializeFormalLawV2({ rule_content: '当事人应按约履行义务。', application: '结合确认事实审查。', limitations: '仍需核对合同全文。', jurisdiction: '中国大陆', source_reference: '正式法源' }) }],
    argumentsList: [{ argument_id: 'argument-1', matter_id: 'matter-1', issue_id: 'issue-1', title: '按约履行主张', conclusion: '可提出履行主张。', status: 'active', description: serializeFormalArgumentV2({ position: '应按约确定履行范围。', reasoning: '合同文本支持该主张。', counter_argument: '对方可能否认合同含义。', response: '应以合同原文回应。', risk: '原件仍需核对。' }) }],
    factEvidenceLinks: [{ fact_id: 'fact-1', evidence_id: 'evidence-1' }], issueFactLinks: [{ issue_id: 'issue-1', fact_id: 'fact-1' }],
    lawIssueLinks: [{ law_id: 'law-1', issue_id: 'issue-1' }], argumentFactLinks: [{ argument_id: 'argument-1', fact_id: 'fact-1' }],
    argumentIssueLinks: [{ argument_id: 'argument-1', issue_id: 'issue-1' }], argumentLawLinks: [{ argument_id: 'argument-1', law_id: 'law-1' }],
  } as any)
}

function validSections(): ComplaintSections {
  return {
    document_type: 'complaint', title: '民事起诉状', parties: { plaintiff: '【待律师补充】', defendant: '【待律师补充】' },
    claims: [{ text: '请求判令本案诉讼费用由被告承担。', source_issue_ids: ['issue-1'], source_fact_ids: ['fact-1'], source_law_ids: ['law-1'], source_argument_ids: ['argument-1'], requires_lawyer_confirmation: true }],
    facts: [{ text: '2025年1月2日双方签署合同。', source_fact_ids: ['fact-1'], source_evidence_ids: ['evidence-1'] }],
    reasoning: [{ issue_id: 'issue-1', argument_id: 'argument-1', position: '应按约确定履行范围。', analysis: '合同文本支持该主张。', source_fact_ids: ['fact-1'], source_law_ids: ['law-1'] }],
    legal_basis: [{ citation: '《中华人民共和国民法典》第五百零九条', text: '当事人应按约履行义务。', source_law_id: 'law-1' }],
    evidence_reference: [{ evidence_id: 'evidence-1', title: '合同文本证据', purpose: '证明合同记载内容。' }],
    conclusion: '具体请求由律师审核。', court: '【待律师补充：受理法院】', signature: '【待律师补充】', date: '【待律师补充】',
  }
}

function fakePrisma() {
  const context = reasoningContext()
  const scope = context.argument_scopes[0]
  let draft: any = null
  return {
    documentDraft: {
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(async () => draft),
      create: vi.fn(async ({ data }: any) => (draft = { id: 'draft-1', ...data, lawyer_note: null, published_document_id: null, published_at: null, created_at: new Date(), updated_at: new Date() })),
      update: vi.fn(async ({ data }: any) => (draft = { ...draft, ...data, updated_at: new Date() })),
    },
    matter: { findUnique: vi.fn(async () => context.matter) },
    evidence: { findMany: vi.fn(async () => context.evidences.map((item) => ({ ...item, matter_id: 'matter-1' }))) },
    fact: { findMany: vi.fn(async () => context.facts.map((item) => ({ ...item, matter_id: 'matter-1' }))) },
    issue: { findMany: vi.fn(async () => context.issues.map((item) => ({ ...item, matter_id: 'matter-1' }))) },
    law: { findMany: vi.fn(async () => scope.laws.map((item) => ({ ...item, matter_id: 'matter-1', description: item.raw_description }))) },
    argument: { findMany: vi.fn(async () => [{ ...scope.argument, matter_id: 'matter-1', issue_id: scope.issue.issue_id, description: scope.argument.raw_description }]) },
    factEvidence: { findMany: vi.fn(async () => [{ fact_id: 'fact-1', evidence_id: 'evidence-1' }]) },
    issueFact: { findMany: vi.fn(async () => [{ issue_id: 'issue-1', fact_id: 'fact-1' }]) },
    lawIssue: { findMany: vi.fn(async () => [{ law_id: 'law-1', issue_id: 'issue-1' }]) },
    argumentFact: { findMany: vi.fn(async () => [{ argument_id: 'argument-1', fact_id: 'fact-1' }]) },
    argumentIssue: { findMany: vi.fn(async () => [{ argument_id: 'argument-1', issue_id: 'issue-1' }]) },
    argumentLaw: { findMany: vi.fn(async () => [{ argument_id: 'argument-1', law_id: 'law-1' }]) },
  } as any
}

describe('Document reasoning integration', () => {
  it('uses AI sections for generate while preserving actual Formal source ids', async () => {
    const prisma = fakePrisma()
    const generator = { generate: vi.fn().mockResolvedValue({ response: validSections(), finish_reason: 'stop' }) }
    const service = new DocumentDraftService(prisma, new DocumentGenerationService(generator))
    const result = await service.generateDraft('matter-1', 'complaint')
    expect(result.document_draft.ai_reasoning).toBe('ai_generated')
    expect(result.document_draft.source_argument_ids).toEqual(['argument-1'])
    expect(result.document_draft.source_fact_ids).toEqual(['fact-1'])
    expect(result.document_draft.source_issue_ids).toEqual(['issue-1'])
    expect(result.document_draft.source_law_ids).toEqual(['law-1'])
    expect(result.document_draft.content).not.toMatch(/argument-1|fact-1|issue-1|law-1|evidence-1/)
  })

  it('uses the same path for regenerate and passes the lawyer instruction', async () => {
    const prisma = fakePrisma()
    const generator = { generate: vi.fn().mockResolvedValue({ response: validSections(), finish_reason: 'stop' }) }
    const service = new DocumentDraftService(prisma, new DocumentGenerationService(generator))
    const generated = await service.generateDraft('matter-1')
    const regenerated = await service.regenerateDraft('matter-1', generated.document_draft.id, { lawyer_note: '只组织已确认论证' })
    expect(regenerated.ai_reasoning).toBe('ai_generated')
    expect(generator.generate).toHaveBeenCalledTimes(2)
    expect(generator.generate.mock.calls[1][0].context_pack.goal.lawyer_instruction).toBe('只组织已确认论证')
  })

  it('falls back to the M160.2 neutral composer after two failures without saving partial output', async () => {
    const prisma = fakePrisma()
    const generator = { generate: vi.fn().mockResolvedValue({ response: '{partial', finish_reason: 'length' }) }
    const service = new DocumentDraftService(prisma, new DocumentGenerationService(generator))
    const result = await service.generateDraft('matter-1')
    expect(generator.generate).toHaveBeenCalledTimes(2)
    expect(result.document_draft.ai_reasoning).toContain('deterministic_fallback:')
    expect(result.document_draft.content).toContain('民事起诉状')
    expect(result.document_draft.content).not.toContain('{partial')
    expect(result.document_draft.content).not.toMatch(/民间借贷|借条|本金|利息/)
  })
})
