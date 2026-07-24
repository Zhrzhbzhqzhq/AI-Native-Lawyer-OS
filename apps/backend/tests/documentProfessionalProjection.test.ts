import { describe, expect, it } from 'vitest'
import type { ComplaintSections } from '../src/services/ai/DocumentGenerationService'
import { projectComplaintContext, projectComplaintSections, PROFESSIONAL_CLAIMS_PLACEHOLDER } from '../src/services/documentProfessionalProjection'
import { assertComplaintContentSafe, type DocumentContext } from '../src/services/documentDraftService'

function sections(): ComplaintSections {
  return {
    document_type: 'complaint',
    title: '民事起诉状',
    parties: { plaintiff: '【待律师补充】', defendant: '【待律师补充】' },
    claims: [{ text: '请求判令本案诉讼费用由被告承担。', source_issue_ids: ['issue-1'], source_fact_ids: ['fact-1'], source_law_ids: ['law-1'], source_argument_ids: ['argument-1'], requires_lawyer_confirmation: true }],
    facts: [
      { text: '甲公司与乙公司签署设备采购合同。', source_fact_ids: ['fact-1'], source_evidence_ids: ['evidence-1'] },
      { text: '甲公司与乙公司签署设备采购合同。', source_fact_ids: ['fact-1'], source_evidence_ids: ['evidence-1'] },
      { text: '乙公司提出质量异议，双方对此存在争议。', source_fact_ids: ['fact-2'], source_evidence_ids: ['evidence-2'] },
    ],
    reasoning: [
      { issue_id: 'issue-1', argument_id: 'argument-1', position: '根据现有材料，付款义务尚需结合履行情况审查。', analysis: '论证：合同履行情况与付款条件应当一并审查。', source_fact_ids: ['fact-1'], source_law_ids: ['law-1'] },
      { issue_id: 'issue-2', argument_id: 'argument-2', position: '质量异议对付款义务的影响仍需审查。', analysis: '回应：异议提出的时间和依据应结合现有材料判断。', source_fact_ids: ['fact-2'], source_law_ids: ['law-1'] },
    ],
    legal_basis: [
      { citation: '《中华人民共和国民法典》第五百零九条', text: '当事人应当按照约定全面履行义务。', source_law_id: 'law-1' },
      { citation: '《中华人民共和国民法典》第五百零九条', text: '当事人应当按照约定全面履行义务。', source_law_id: 'law-1' },
    ],
    evidence_reference: [
      { evidence_id: 'evidence-1', title: '设备采购合同', purpose: '真实性、合法性、关联性由律师审核。' },
      { evidence_id: 'evidence-1', title: '设备采购合同', purpose: '重复说明。' },
      { evidence_id: 'evidence-2', title: '质量异议材料', purpose: '具体内容需核对材料原文。' },
    ],
    conclusion: '具体责任范围应由律师结合证据进一步确认。',
    court: '【待律师补充：受理法院】', signature: '【待律师补充】', date: '【待律师补充】',
  }
}

describe('M160.4.2 Professional Complaint Projection', () => {
  it('projects validated sections into a natural complaint without internal labels or repetition', () => {
    const content = projectComplaintSections(sections())
    expect(content).toContain('请求判令本案诉讼费用由被告承担。')
    expect(content).not.toContain(PROFESSIONAL_CLAIMS_PLACEHOLDER)
    expect(content).not.toContain('【待律师确认】')
    expect(content.match(/甲公司与乙公司签署设备采购合同。/g)).toHaveLength(1)
    expect(content.match(/《中华人民共和国民法典》第五百零九条/g)).toHaveLength(1)
    expect(content.match(/设备采购合同/g)).toHaveLength(2)
    expect(content.match(/质量异议材料/g)).toHaveLength(1)
    expect(content).toContain('双方对此存在争议')
    expect(content).not.toMatch(/争议焦点：|本方主张：|论证：|回应：|阶段性结论：|Confirmed Facts|Applicable Laws|Legal Reasoning|Counter Argument|Risk:|Limitations:/)
    expect(content).not.toContain('真实性、合法性、关联性由律师审核')
    expect(content).not.toContain('具体内容需核对材料原文')
    expect(content.indexOf('具体责任范围')).toBeLessThan(content.indexOf('\n此致'))
    expect(content.slice(content.indexOf('\n此致'))).not.toContain('具体责任范围')
    expect(content.endsWith('【待律师补充】')).toBe(true)
    expect(() => assertComplaintContentSafe(content)).not.toThrow()
  })

  it('uses the same professional projection for deterministic fallback context', () => {
    const context = {
      matter: { matter_id: 'matter-1', title: '设备采购合同纠纷', description: '' }, document_type: 'complaint', lawyer_instruction: '',
      evidences: [{ evidence_id: 'evidence-1', title: '设备采购合同', description: '具体内容需核对材料原文。', status: 'active', material: null }],
      facts: [{ fact_id: 'fact-1', title: '双方签署合同', description: '甲公司与乙公司签署设备采购合同。', status: 'active', evidences: [] }],
      issues: [{ issue_id: 'issue-1', title: '付款义务履行范围', description: '', status: 'active' }],
      laws: [{ law_id: 'law-1', title: '合同履行规则', citation: '《中华人民共和国民法典》第五百零九条', description: '', rule_content: '当事人应当按照约定全面履行义务。', application: '结合履行情况审查。', limitations: '仍需律师核验。', jurisdiction: '', source_reference: '', semantic_encoding: 'valid-v2', semantic_recovery: 'full', raw_description: '', status: 'active' }],
      arguments: [], excluded_scopes: [],
      argument_scopes: [{
        argument: { argument_id: 'argument-1', title: '付款义务主张', description: '', conclusion: '具体付款范围仍需结合证据确认。', position: '根据现有材料，付款范围尚需审查。', reasoning: '合同履行情况与付款条件应当一并审查。', counter_argument: '对方可能提出质量异议。', response: '质量异议的提出时间和依据应结合证据审查。', risk: '证据可能不足。', semantic_encoding: 'valid-v2', semantic_recovery: 'full', raw_description: '', status: 'active' },
        issue: { issue_id: 'issue-1', title: '付款义务履行范围', description: '', status: 'active' },
        facts: [], laws: [],
      }],
    } as unknown as DocumentContext
    context.arguments = context.argument_scopes.map((scope) => scope.argument)
    const content = projectComplaintContext(context)
    expect(content).toContain('付款范围尚需审查')
    expect(content).toContain('质量异议的提出时间和依据应结合证据审查')
    expect(content).not.toContain('对方可能提出质量异议')
    expect(content).not.toContain('证据可能不足')
    expect(content).not.toContain('仍需律师核验')
    expect(content).not.toMatch(/民间借贷|借款本金|出借义务|借条|逾期利息|借款期限|还款义务/)
    expect(() => assertComplaintContentSafe(content)).not.toThrow()
  })

  it('groups primary alternative and ancillary runtime Claims', () => {
    const input = sections()
    input.claims = [
      { text: '请求判令被告继续履行合同约定的房屋交付义务。', claim_role: 'primary', source_issue_ids: ['issue-1'], source_fact_ids: ['fact-1'], source_law_ids: ['law-1'], source_argument_ids: ['argument-1'], requires_lawyer_confirmation: true },
      { text: '请求判令解除原告与被告签订的商品房买卖合同。', claim_role: 'alternative', source_issue_ids: ['issue-2'], source_fact_ids: ['fact-2'], source_law_ids: ['law-2'], source_argument_ids: ['argument-2'], requires_lawyer_confirmation: true },
      { text: '请求判令本案诉讼费用由被告承担。', claim_role: 'ancillary', source_issue_ids: ['issue-1'], source_fact_ids: ['fact-1'], source_law_ids: ['law-1'], source_argument_ids: ['argument-1'], requires_lawyer_confirmation: true },
    ]

    const content = projectComplaintSections(input)

    expect(content).toContain('一、主位请求\n1. 请求判令被告继续履行合同约定的房屋交付义务。')
    expect(content).toContain('二、备位请求\n1. 请求判令解除原告与被告签订的商品房买卖合同。')
    expect(content).toContain('三、附随请求\n1. 请求判令本案诉讼费用由被告承担。')
    expect(content).not.toContain('claim_role')
    expect(() => assertComplaintContentSafe(content)).not.toThrow()
  })

  it('treats a legacy Claim without claim_role as primary and preserves the old list layout', () => {
    const content = projectComplaintSections(sections())

    expect(content).toContain('诉讼请求：\n1. 请求判令本案诉讼费用由被告承担。')
    expect(content).not.toContain('主位请求')
    expect(content).not.toContain('备位请求')
  })

  it('rejects fixed analysis headings and conclusions after the closing block', () => {
    expect(() => assertComplaintContentSafe('民事起诉状\n争议焦点：付款范围')).toThrowError('unsafe_document_content')
    expect(() => assertComplaintContentSafe('民事起诉状\nPosition: 应付款')).toThrowError('unsafe_document_content')
    expect(() => assertComplaintContentSafe('民事起诉状\n此致\n【待律师补充：受理法院】\n具状人：\n【待律师补充】\n日期：\n【待律师补充】\n结论：应付款')).toThrowError('unsafe_document_content')
    expect(() => assertComplaintContentSafe('民事起诉状\n此致\n【待律师补充：受理法院】\n案件论证\n具状人：\n【待律师补充】\n日期：\n【待律师补充】')).toThrowError('unsafe_document_content')
  })
})
