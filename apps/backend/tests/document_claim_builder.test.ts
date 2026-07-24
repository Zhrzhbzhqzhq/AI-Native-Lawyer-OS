import { describe, expect, it } from 'vitest'
import { buildDocumentReasoningScope } from '../src/services/ai/DocumentGenerationService'
import { buildRuntimeDocumentClaims } from '../src/services/document_claim_builder'
import { buildDocumentContext } from '../src/services/document_context_builder'
import { serializeFormalArgumentV2, serializeFormalLawV2 } from '../src/services/formalSemanticCodec'

function reasoningContext() {
  return buildDocumentContext({
    matter_id: 'matter-1', document_type: 'complaint', lawyer_instruction: '',
    matter: { matter_id: 'matter-1', title: '瑞峰设备采购合同纠纷', description: '设备款支付争议。' },
    evidences: [{ evidence_id: 'evidence-1', matter_id: 'matter-1', title: '付款记录', description: '证明设备款支付情况。', status: 'active', material: null }],
    facts: [{ fact_id: 'fact-1', matter_id: 'matter-1', title: '设备款尚未全部支付', description: '浩达精密制造有限公司尚欠260000元设备款。', status: 'confirmed' }],
    issues: [{ issue_id: 'issue-1', matter_id: 'matter-1', title: '剩余设备款是否应支付', description: '审查剩余设备款支付责任。', status: 'active' }],
    laws: [{ law_id: 'law-1', matter_id: 'matter-1', title: '价款支付规则', citation: '《中华人民共和国民法典》第六百二十六条', status: 'active', description: serializeFormalLawV2({ rule_content: '买受人应当按照约定支付价款。', application: '结合已确认付款事实审查。', limitations: '具体请求仍需律师确认。', jurisdiction: '中国大陆', source_reference: '正式法源' }) }],
    argumentsList: [{ argument_id: 'argument-1', matter_id: 'matter-1', issue_id: 'issue-1', title: '支付剩余设备款', conclusion: '可主张支付剩余设备款。', status: 'active', description: serializeFormalArgumentV2({ position: '应按约支付剩余设备款。', reasoning: '付款事实和价款支付规则支持该主张。', counter_argument: '对方可能提出履行抗辩。', response: '依据正式事实和法律回应。', risk: '具体金额需以已确认事实为限。' }) }],
    factEvidenceLinks: [{ fact_id: 'fact-1', evidence_id: 'evidence-1' }],
    issueFactLinks: [{ issue_id: 'issue-1', fact_id: 'fact-1' }],
    lawIssueLinks: [{ law_id: 'law-1', issue_id: 'issue-1' }],
    argumentFactLinks: [{ argument_id: 'argument-1', fact_id: 'fact-1' }],
    argumentIssueLinks: [{ argument_id: 'argument-1', issue_id: 'issue-1' }],
    argumentLawLinks: [{ argument_id: 'argument-1', law_id: 'law-1' }],
  })
}

function objectiveScopes() {
  const base = reasoningContext().argument_scopes[0]
  const continueScope = structuredClone(base)
  continueScope.issue = {
    ...continueScope.issue,
    issue_id: 'issue-continue',
    title: '继续履行房屋交付义务是否可行',
    description: '审查开发公司继续履行并交付房屋的义务。',
  }
  continueScope.argument = {
    ...continueScope.argument,
    argument_id: 'argument-continue',
    title: '继续履行房屋交付义务',
    position: '开发公司应继续履行商品房买卖合同并交付房屋。',
    reasoning: '合同及未交付事实支持继续履行请求。',
    conclusion: '继续履行请求具备阶段性依据。',
  }
  continueScope.facts = [{
    ...continueScope.facts[0],
    fact_id: 'fact-not-delivered',
    title: '开发公司尚未交付房屋',
    description: '合同约定的房屋交付义务尚未履行。',
  }]
  continueScope.laws = [{
    ...continueScope.laws[0],
    law_id: 'law-continue',
    title: '非金钱债务继续履行规则',
    description: '当事人可以请求继续履行房屋交付义务。',
    rule_content: '对方可以请求继续履行，但存在法定除外情形的除外。',
    application: '用于审查房屋交付义务能否继续履行。',
  }]

  const terminateScope = structuredClone(base)
  terminateScope.issue = {
    ...terminateScope.issue,
    issue_id: 'issue-terminate',
    title: '解除合同的条件是否成立',
    description: '审查商品房买卖合同解除权。',
  }
  terminateScope.argument = {
    ...terminateScope.argument,
    argument_id: 'argument-terminate',
    title: '解除合同请求',
    position: '经催告仍未履行时可以主张解除合同。',
    reasoning: '催告及未履行事实支持审查合同解除权。',
    conclusion: '解除合同请求具备阶段性依据。',
  }
  terminateScope.facts = [{
    ...terminateScope.facts[0],
    fact_id: 'fact-demand',
    title: '王某已经催告交付',
    description: '王某已催告开发公司履行房屋交付义务。',
  }]
  terminateScope.laws = [{
    ...terminateScope.laws[0],
    law_id: 'law-terminate',
    title: '迟延履行时的合同解除权',
    description: '经催告后仍未履行时可以解除合同。',
    rule_content: '迟延履行主要债务，经催告后仍未履行的，可以解除合同。',
    application: '用于审查商品房买卖合同解除权。',
  }]
  return [continueScope, terminateScope]
}

describe('DocumentClaimBuilder', () => {
  it('generates the supported equipment payment and litigation-cost claims', () => {
    const context = reasoningContext()
    context.facts[0].title = '设备款尚未全部支付'
    context.facts[0].description = '浩达精密制造有限公司已支付600000元设备款，剩余260000元尾款未支付。'
    context.argument_scopes[0].facts[0].title = context.facts[0].title
    context.argument_scopes[0].facts[0].description = context.facts[0].description

    const claims = buildRuntimeDocumentClaims(context.argument_scopes)

    expect(claims.map((claim) => claim.text)).toEqual([
      '请求判令被告向原告支付260000元尾款。',
      '请求判令本案诉讼费用由被告承担。',
    ])
    expect(claims.map((claim) => claim.claim_role)).toEqual(['primary', 'ancillary'])
    expect(JSON.stringify(claims)).not.toContain('支付600000元')
    for (const claim of claims) {
      expect(claim.source_issue_ids).toEqual(['issue-1'])
      expect(claim.source_fact_ids).toEqual(['fact-1'])
      expect(claim.source_law_ids).toEqual(['law-1'])
      expect(claim.source_argument_ids).toEqual(['argument-1'])
      expect(claim.requires_lawyer_confirmation).toBe(true)
    }
  })

  it('does not generate a monetary claim without a Formal Fact amount', () => {
    const context = reasoningContext()
    context.argument_scopes[0].facts[0].description = '双方签订设备采购合同，但未确认尚欠金额。'

    const claims = buildRuntimeDocumentClaims(context.argument_scopes)

    expect(claims.map((claim) => claim.text)).toEqual(['请求判令本案诉讼费用由被告承担。'])
    expect(JSON.stringify(claims)).not.toMatch(/\d+元/)
  })

  it('does not use Material content as a Claim source', () => {
    const context = reasoningContext()
    context.argument_scopes[0].facts[0].description = '双方签订设备采购合同。'
    context.material_sources = [{
      material_id: 'material-1',
      title: '付款记录',
      source: 'client',
      content: '尚欠999999元设备款。',
      contentLength: 15,
    }]

    const scope = buildDocumentReasoningScope(context)

    expect(scope.claims.map((claim) => claim.text)).toEqual(['请求判令本案诉讼费用由被告承担。'])
    expect(JSON.stringify(scope.claims)).not.toContain('999999')
    expect(Object.keys(scope.claims[0])).not.toContain('source_material_ids')
  })

  it('passes lawyer instruction from Document Context into the Claim Builder', () => {
    const context = reasoningContext()
    context.lawyer_instruction = '诉讼目标：terminate_contract'

    const scope = buildDocumentReasoningScope(context)

    expect(scope.claims.map((claim) => claim.text)).toEqual(['请求判令本案诉讼费用由被告承担。'])
  })

  it('does not generate unsupported interest, penalty or lawyer-fee claims', () => {
    const context = reasoningContext()
    context.argument_scopes[0].facts[0].description = '材料提及尚欠260000元设备款及利息、违约金和律师费。'

    const claims = buildRuntimeDocumentClaims(context.argument_scopes)

    expect(claims.map((claim) => claim.text)).toEqual(['请求判令本案诉讼费用由被告承担。'])
  })

  it('generates a continue-performance claim from a matching Formal Scope', () => {
    const claims = buildRuntimeDocumentClaims(objectiveScopes(), '诉讼目标：continue_performance')

    expect(claims[0]).toMatchObject({
      text: '请求判令被告继续履行合同约定的房屋交付义务。',
      claim_role: 'primary',
      source_issue_ids: ['issue-continue'],
      source_fact_ids: ['fact-not-delivered'],
      source_law_ids: ['law-continue'],
      source_argument_ids: ['argument-continue'],
      requires_lawyer_confirmation: true,
    })
  })

  it('generates a terminate-contract claim from a matching Formal Scope', () => {
    const claims = buildRuntimeDocumentClaims(objectiveScopes(), '备选诉讼目标：terminate_contract')

    expect(claims[0]).toMatchObject({
      text: '请求判令解除原告与被告签订的合同。',
      claim_role: 'alternative',
      source_issue_ids: ['issue-terminate'],
      source_fact_ids: ['fact-demand'],
      source_law_ids: ['law-terminate'],
      source_argument_ids: ['argument-terminate'],
      requires_lawyer_confirmation: true,
    })
  })

  it('preserves the primary and alternative objective order', () => {
    const claims = buildRuntimeDocumentClaims(
      objectiveScopes(),
      '诉讼目标：continue_performance\n备选诉讼目标：terminate_contract',
    )

    expect(claims.map((claim) => claim.text)).toEqual([
      '请求判令被告继续履行合同约定的房屋交付义务。',
      '请求判令解除原告与被告签订的合同。',
      '请求判令本案诉讼费用由被告承担。',
    ])
    expect(claims.map((claim) => claim.claim_role)).toEqual(['primary', 'alternative', 'ancillary'])
    expect(claims.every((claim) => !Object.keys(claim).includes('claim_role'))).toBe(true)
    expect(JSON.stringify(claims)).not.toContain('claim_role')
  })

  it('does not generate an objective claim without a matching Formal Scope', () => {
    const claims = buildRuntimeDocumentClaims([reasoningContext().argument_scopes[0]], '诉讼目标：terminate_contract')

    expect(claims.map((claim) => claim.text)).toEqual(['请求判令本案诉讼费用由被告承担。'])
  })

  it('does not treat an ordinary lawyer instruction as litigation-objective control', () => {
    const context = reasoningContext()
    context.argument_scopes[0].facts[0].description = '浩达精密制造有限公司尚欠260000元设备款。'

    const claims = buildRuntimeDocumentClaims(context.argument_scopes, '请缩短事实与理由，语言更正式。')

    expect(claims.map((claim) => claim.text)).toEqual([
      '请求判令被告向原告支付260000元设备款。',
      '请求判令本案诉讼费用由被告承担。',
    ])
  })

  it('keeps the existing confirmed-amount behavior when expressly selected', () => {
    const context = reasoningContext()
    context.argument_scopes[0].facts[0].description = '已支付600000元设备款，剩余260000元尾款未支付。'

    const claims = buildRuntimeDocumentClaims(context.argument_scopes, '诉讼目标：pay_confirmed_amount')

    expect(claims.map((claim) => claim.text)).toEqual([
      '请求判令被告向原告支付260000元尾款。',
      '请求判令本案诉讼费用由被告承担。',
    ])
    expect(claims.map((claim) => claim.claim_role)).toEqual(['primary', 'ancillary'])
    expect(JSON.stringify(claims)).not.toContain('支付600000元')
  })
})
