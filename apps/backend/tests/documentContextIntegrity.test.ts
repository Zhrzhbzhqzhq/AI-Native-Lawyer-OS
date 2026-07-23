import { describe, expect, it } from 'vitest'
import {
  assertComplaintContentSafe,
  buildDocumentContext,
  composeNeutralComplaint,
} from '../src/services/documentDraftService'
import DocumentDraftService from '../src/services/documentDraftService'
import {
  FORMAL_ARGUMENT_V2_HEADER,
  FORMAL_LAW_V2_HEADER,
  serializeFormalArgumentV2,
  serializeFormalLawV2,
} from '../src/services/formalSemanticCodec'

function sourceRows() {
  return {
    matter: { matter_id: 'matter-1', title: '甲公司与乙公司合同纠纷', description: '合同履行产生争议。' },
    evidences: [
      { evidence_id: 'evidence-a', matter_id: 'matter-1', material_id: 'material-a', title: '合同文本证据', description: '记录双方合同约定。', status: 'active', material: { material_id: 'material-a', title: '合同文本' } },
      { evidence_id: 'evidence-b', matter_id: 'matter-1', material_id: 'material-b', title: '无关证据', description: '不属于有效论证范围。', status: 'active', material: { material_id: 'material-b', title: '其他材料' } },
    ],
    facts: [
      { fact_id: 'fact-a', matter_id: 'matter-1', title: '双方签署合同', description: '甲公司与乙公司签署合同。', status: 'active' },
      { fact_id: 'fact-b', matter_id: 'matter-1', title: '无关事实', description: '没有进入有效论证。', status: 'active' },
    ],
    issues: [
      { issue_id: 'issue-a', matter_id: 'matter-1', title: '合同义务履行范围', description: '合同义务的履行范围如何确定。', status: 'active' },
      { issue_id: 'issue-b', matter_id: 'matter-1', title: '无关争点', description: '没有有效论证。', status: 'active' },
    ],
    laws: [
      { law_id: 'law-a', matter_id: 'matter-1', title: '合同履行规则', citation: '《中华人民共和国民法典》第五百零九条', description: '当事人应当按照约定全面履行义务。', status: 'active' },
      { law_id: 'law-b', matter_id: 'matter-1', title: '无关规则', citation: '待核验条文', description: '没有进入有效论证。', status: 'active' },
    ],
    argumentsList: [
      { argument_id: 'argument-a', matter_id: 'matter-1', issue_id: 'issue-a', title: '合同义务应依约确定', description: '应结合合同文本审查双方义务。', conclusion: '合同文本是审查履行范围的基础。', status: 'active' },
    ],
    factEvidenceLinks: [{ fact_id: 'fact-a', evidence_id: 'evidence-a' }],
    issueFactLinks: [{ issue_id: 'issue-a', fact_id: 'fact-a' }, { issue_id: 'issue-b', fact_id: 'fact-b' }],
    lawIssueLinks: [{ law_id: 'law-a', issue_id: 'issue-a' }, { law_id: 'law-b', issue_id: 'issue-b' }],
    argumentFactLinks: [{ argument_id: 'argument-a', fact_id: 'fact-a' }],
    argumentIssueLinks: [{ argument_id: 'argument-a', issue_id: 'issue-a' }],
    argumentLawLinks: [{ argument_id: 'argument-a', law_id: 'law-a' }],
  }
}

describe('M160.2 Document Context Integrity', () => {
  it('builds one relationship-backed scope and excludes unrelated formal rows', () => {
    const context = buildDocumentContext({
      ...sourceRows(),
      matter_id: 'matter-1',
      document_type: 'complaint',
      lawyer_instruction: '',
    })

    expect(context.argument_scopes).toHaveLength(1)
    expect(context.arguments.map((row) => row.argument_id)).toEqual(['argument-a'])
    expect(context.issues.map((row) => row.issue_id)).toEqual(['issue-a'])
    expect(context.facts.map((row) => row.fact_id)).toEqual(['fact-a'])
    expect(context.laws.map((row) => row.law_id)).toEqual(['law-a'])
    expect(context.evidences.map((row) => row.evidence_id)).toEqual(['evidence-a'])
  })

  it('composes a neutral complaint only from scoped formal sources', () => {
    const context = buildDocumentContext({
      ...sourceRows(),
      matter_id: 'matter-1',
      document_type: 'complaint',
      lawyer_instruction: '',
    })
    const draft = composeNeutralComplaint(context)

    expect(draft.content).toContain('双方签署合同')
    expect(draft.content).toContain('合同义务应依约确定')
    expect(draft.content).toContain('《中华人民共和国民法典》第五百零九条')
    expect(draft.content).toContain('合同文本证据')
    expect(draft.content).not.toContain('无关事实')
    expect(draft.content).not.toContain('无关争点')
    expect(draft.content).not.toContain('无关规则')
    expect(draft.content).not.toContain('无关证据')
    expect(draft.content).not.toMatch(/借贷关系|出借义务|借款本金|逾期利息|借条|借款期限届满/)
    expect(draft.content).toContain('原告：\n【待律师补充】')
    expect(draft.content).toContain('被告：\n【待律师补充】')
    expect(draft.content).toContain('【待律师补充：受理法院】')
    expect(draft.source_argument_ids).toEqual(['argument-a'])
    expect(draft.source_issue_ids).toEqual(['issue-a'])
    expect(draft.source_fact_ids).toEqual(['fact-a'])
    expect(draft.source_law_ids).toEqual(['law-a'])
  })

  it('consumes V2 semantics without exposing counter, risk, limitations or raw encoding', () => {
    const rows = sourceRows()
    rows.argumentsList[0].description = serializeFormalArgumentV2({
      position: '合同义务应按约履行',
      reasoning: '合同文本与履行事实可以支持该项主张。',
      counter_argument: '对方可能提出其他解释。',
      response: '应以正式证据回应该解释。',
      risk: '仍需核对合同原件。',
    })
    rows.laws[0].description = serializeFormalLawV2({
      rule_content: '当事人应当按照约定履行义务。',
      application: '应结合已确认履行事实进行审查。',
      limitations: '具体适用仍需律师核验。',
      jurisdiction: '中华人民共和国大陆地区',
      source_reference: '律师核验来源',
    })
    const context = buildDocumentContext({ ...rows, matter_id: 'matter-1', document_type: 'complaint', lawyer_instruction: '' })
    const draft = composeNeutralComplaint(context)

    expect(context.argument_scopes[0].argument).toMatchObject({
      position: '合同义务应按约履行',
      reasoning: '合同文本与履行事实可以支持该项主张。',
      counter_argument: '对方可能提出其他解释。',
      response: '应以正式证据回应该解释。',
      risk: '仍需核对合同原件。',
      semantic_encoding: 'valid-v2',
    })
    expect(context.laws[0]).toMatchObject({
      rule_content: '当事人应当按照约定履行义务。',
      application: '应结合已确认履行事实进行审查。',
      limitations: '具体适用仍需律师核验。',
      jurisdiction: '中华人民共和国大陆地区',
      source_reference: '律师核验来源',
      semantic_encoding: 'valid-v2',
    })
    expect(draft.content).toContain('合同义务应按约履行')
    expect(draft.content).toContain('应以正式证据回应该解释')
    expect(draft.content).not.toContain('对方可能提出其他解释')
    expect(draft.content).not.toContain('仍需核对合同原件')
    expect(draft.content).not.toContain('具体适用仍需律师核验')
    expect(draft.content).not.toContain(FORMAL_ARGUMENT_V2_HEADER)
    expect(draft.content).not.toContain(FORMAL_LAW_V2_HEADER)
  })

  it('keeps legacy plain descriptions conservative and excludes invalid V2 scopes', () => {
    const legacy = buildDocumentContext({ ...sourceRows(), matter_id: 'matter-1', document_type: 'complaint', lawyer_instruction: '' })
    expect(legacy.argument_scopes[0].argument).toMatchObject({
      semantic_encoding: 'legacy-plain',
      position: '',
      reasoning: '应结合合同文本审查双方义务。',
      counter_argument: '',
      response: '',
      risk: '',
    })

    const invalidRows = sourceRows()
    invalidRows.argumentsList[0].description = `${FORMAL_ARGUMENT_V2_HEADER}\n{bad`
    const invalid = buildDocumentContext({ ...invalidRows, matter_id: 'matter-1', document_type: 'complaint', lawyer_instruction: '' })
    expect(invalid.argument_scopes).toEqual([])
    expect(invalid.excluded_scopes[0].reasons).toContain('argument_semantic_invalid-v2')
  })

  it.each([
    ['fact without evidence', { factEvidenceLinks: [] }, 'fact_without_formal_evidence'],
    ['fact outside issue', { issueFactLinks: [] }, 'source_fact_outside_issue'],
    ['law outside issue', { lawIssueLinks: [] }, 'source_law_outside_issue'],
    ['multiple issues', { argumentIssueLinks: [{ argument_id: 'argument-a', issue_id: 'issue-a' }, { argument_id: 'argument-a', issue_id: 'issue-b' }] }, 'argument_must_have_one_issue'],
  ])('excludes an invalid scope: %s', (_label, override, reason) => {
    const context = buildDocumentContext({
      ...sourceRows(),
      ...override,
      matter_id: 'matter-1',
      document_type: 'complaint',
      lawyer_instruction: '',
    })
    expect(context.argument_scopes).toEqual([])
    expect(context.excluded_scopes[0].reasons).toContain(reason)
  })

  it('rejects absolute outcome language in the boundary guard', () => {
    for (const phrase of ['必然胜诉', '一定胜诉', '法院一定支持', '法院必然支持', '对方一定承担责任', '对方必然承担责任']) {
      expect(() => assertComplaintContentSafe(`民事起诉状\n${phrase}`)).toThrowError('unsafe_document_content')
    }
    expect(() => assertComplaintContentSafe('借款合同约定了利息，具体请求由律师确认。')).not.toThrow()
    expect(() => assertComplaintContentSafe(`${FORMAL_ARGUMENT_V2_HEADER}\n{}`)).toThrowError('unsafe_document_content')
    expect(() => assertComplaintContentSafe(`${FORMAL_LAW_V2_HEADER}\n{}`)).toThrowError('unsafe_document_content')
  })

  it('does not allow unsafe existing content to enter ready_to_publish', async () => {
    const update = async () => { throw new Error('update must not be called') }
    const service = new DocumentDraftService({
      documentDraft: {
        findUnique: async () => ({
          id: 'draft-1', matter_id: 'matter-1', content: '法院一定支持本方请求', review_status: 'editing',
          published_at: null, published_document_id: null,
        }),
        update,
      },
    } as any)

    await expect(service.updateDraft('matter-1', 'draft-1', { review_status: 'ready_to_publish' })).rejects.toMatchObject({ code: 'unsafe_document_content' })
  })
})
