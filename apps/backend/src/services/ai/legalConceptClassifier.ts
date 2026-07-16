export type FactConceptClassification = {
  agreement: boolean
  delivery: boolean
  default: boolean
}

export type IssueConcept = keyof FactConceptClassification

export const ISSUE_CONCEPT_ORDER: IssueConcept[] = ['agreement', 'delivery', 'default']

const CONCEPT_PATTERNS: Record<IssueConcept, RegExp> = {
  agreement: /(合意|借贷关系|借条|借款约定|合同成立)/,
  delivery: /(交付|转账|汇款|支付|到账|银行流水)/,
  default: /(到期|未还|未清偿|催收|违约)/,
}

const EMPTY_CLASSIFICATION: FactConceptClassification = {
  agreement: false,
  delivery: false,
  default: false,
}

function classifyText(value: unknown): FactConceptClassification {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return { ...EMPTY_CLASSIFICATION }
  return {
    agreement: CONCEPT_PATTERNS.agreement.test(text),
    delivery: CONCEPT_PATTERNS.delivery.test(text),
    default: CONCEPT_PATTERNS.default.test(text),
  }
}

function hasConcept(classification: FactConceptClassification) {
  return ISSUE_CONCEPT_ORDER.some((concept) => classification[concept])
}

export function classifyFactConcept(fact: unknown): FactConceptClassification {
  if (!fact || typeof fact !== 'object' || Array.isArray(fact)) return { ...EMPTY_CLASSIFICATION }
  const row = fact as Record<string, unknown>

  // The first field containing a supported concept is authoritative. This
  // prevents lower-priority narrative text from overriding a precise title.
  for (const value of [row.title, row.category, row.description, row.content]) {
    const classification = classifyText(value)
    if (hasConcept(classification)) return classification
  }
  return { ...EMPTY_CLASSIFICATION }
}

export function inferIssueTypeFromFacts(facts: unknown[]): IssueConcept | null {
  const matched = new Set<IssueConcept>()
  for (const fact of Array.isArray(facts) ? facts : []) {
    const classification = classifyFactConcept(fact)
    for (const concept of ISSUE_CONCEPT_ORDER) {
      if (classification[concept]) matched.add(concept)
    }
  }
  return matched.size === 1 ? Array.from(matched)[0] : null
}

const ISSUE_TEMPLATES: Record<IssueConcept, { title: string; description: string; reason: string }> = {
  agreement: {
    title: '双方是否形成民间借贷关系及债权债务关系',
    description: '应根据已确认事实审查双方是否形成借贷合意，并据此认定民间借贷关系及债权债务关系是否成立。',
    reason: '关联事实反映借条、借款约定或其他借贷合意信息，需要判断民间借贷关系及债权债务关系是否形成。',
  },
  delivery: {
    title: '出借人是否完成借款资金交付，银行流水等证据能否证明资金交付事实',
    description: '应根据已确认的银行流水、转账证据及其他支付记录，审查借款资金是否已经实际交付。',
    reason: '关联事实包含资金交付、银行流水、转账或其他支付信息，需要判断其能否证明出借义务已经履行。',
  },
  default: {
    title: '借款人是否到期未还并承担违约责任及利息责任',
    description: '应根据已确认的到期、未还及催收事实，审查借款人是否应承担违约责任及相应利息责任。',
    reason: '关联事实包含债务到期、未还款、催收或违约信息，需要判断违约责任和利息责任范围。',
  },
}

export function buildDeterministicIssueSuggestions(facts: unknown[]) {
  const groupedIds: Record<IssueConcept, Set<string>> = {
    agreement: new Set<string>(),
    delivery: new Set<string>(),
    default: new Set<string>(),
  }

  for (const fact of Array.isArray(facts) ? facts : []) {
    if (!fact || typeof fact !== 'object' || Array.isArray(fact)) continue
    const row = fact as Record<string, unknown>
    const factId = typeof row.fact_id === 'string' ? row.fact_id.trim() : ''
    if (!factId) continue
    const classification = classifyFactConcept(row)
    for (const concept of ISSUE_CONCEPT_ORDER) {
      if (classification[concept]) groupedIds[concept].add(factId)
    }
  }

  return ISSUE_CONCEPT_ORDER.flatMap((issueType) => {
    const sourceFactIds = Array.from(groupedIds[issueType]).sort()
    if (sourceFactIds.length === 0) return []
    const template = ISSUE_TEMPLATES[issueType]
    return [{
      title: template.title,
      description: template.description,
      issue_type: issueType,
      source_fact_ids: sourceFactIds,
      reason: template.reason,
      ai_reasoning: template.reason,
      confidence: 0.9,
    }]
  })
}
