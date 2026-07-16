import { ISSUE_CONCEPT_ORDER, type IssueConcept } from './legalConceptClassifier'

export type TypedIssueInput = {
  issue_id: string
  issue_type: IssueConcept
  title?: string
}

const LAW_TEMPLATES: Record<IssueConcept, {
  title: string
  citation: string
  rule_content: string
  application: string
  limitations: string
  reason: string
}> = {
  agreement: {
    title: '民间借贷关系与合同成立规则',
    citation: '《中华人民共和国民法典》第六百六十七条、第六百六十八条',
    rule_content: '借款合同是借款人向贷款人借款，到期返还借款并支付利息的合同；当事人形成真实借贷合意并符合法律规定时，可以结合借据、聊天记录和实际履行情况判断借款合同及民间借贷关系是否成立。',
    application: '用于审查借据、聊天记录所反映的借贷合意能否与资金交付等实际履行事实相互印证，并据此认定借款合同和民间借贷关系是否依法成立。',
    limitations: '应对借据、聊天记录、实际履行情况及其他正式证据进行综合判断，避免仅凭单一材料认定借贷关系。',
    reason: '该规则用于回答借贷关系及合同成立争议。',
  },
  delivery: {
    title: '借款资金交付与举证规则',
    citation: '《中华人民共和国民法典》第六百七十九条；《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》第二条',
    rule_content: '自然人之间的借款合同自贷款人提供借款时成立；主张民间借贷关系成立的一方应就资金交付承担举证责任，并提交转账记录、银行流水等能够证明借贷法律关系存在的证据。',
    application: '用于审查借款资金是否实际交付，以及现有转账记录和银行流水能否完成举证责任。',
    limitations: '举证时应核对支付主体、收款主体、款项性质，并判断银行流水与转账记录之间是否能够相互印证资金交付事实。',
    reason: '该规则用于回答资金交付与举证责任争议。',
  },
  default: {
    title: '到期履行、违约及利息责任规则',
    citation: '《中华人民共和国民法典》第五百零九条、第五百七十七条；《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》第二十五条',
    rule_content: '当事人应当按照约定全面履行义务；债务到期后未履行或者履行不符合约定的，应承担继续履行、采取补救措施或者赔偿损失等违约责任，利息责任并应受司法保护范围约束。',
    application: '用于审查债务是否已经到期、借款人是否未履行还款义务，以及违约责任和利息责任应如何依法认定。',
    limitations: '应核实债务到期时间、实际未履行情况、利息约定和适用期间，再判断违约责任及利息责任范围。',
    reason: '该规则用于回答到期履行、违约及利息责任争议。',
  },
}

export function buildLawCandidate(input: { issueType: IssueConcept; sourceIssueIds: string[] }) {
  const sourceIssueIds = Array.from(new Set(input.sourceIssueIds.map((id) => String(id || '').trim()).filter(Boolean))).sort()
  if (sourceIssueIds.length === 0) return null
  const template = LAW_TEMPLATES[input.issueType]
  return {
    ...template,
    issue_type: input.issueType,
    source_issue_ids: sourceIssueIds,
    issue_title: template.title,
    description: `适用原因：${template.application}\n证明作用：${template.rule_content}\n支持结论：${template.reason}`,
    jurisdiction: '中国大陆',
    source_reference: 'lawdesk-v1-deterministic-legal-rule',
    ai_reasoning: template.reason,
    confidence: 0.9,
  }
}

export function buildDeterministicLawCandidates(issues: TypedIssueInput[]) {
  const grouped: Record<IssueConcept, Set<string>> = {
    agreement: new Set<string>(),
    delivery: new Set<string>(),
    default: new Set<string>(),
  }
  for (const issue of Array.isArray(issues) ? issues : []) {
    if (!issue || !ISSUE_CONCEPT_ORDER.includes(issue.issue_type)) continue
    const issueId = String(issue.issue_id || '').trim()
    if (issueId) grouped[issue.issue_type].add(issueId)
  }
  return ISSUE_CONCEPT_ORDER.flatMap((issueType) => {
    const candidate = buildLawCandidate({ issueType, sourceIssueIds: Array.from(grouped[issueType]) })
    return candidate ? [candidate] : []
  })
}
