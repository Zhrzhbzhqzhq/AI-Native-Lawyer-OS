import type { DocumentArgumentScope } from './document_context_builder'

export type RuntimeDocumentClaim = {
  text: string
  source_issue_ids: string[]
  source_fact_ids: string[]
  source_law_ids: string[]
  source_argument_ids: string[]
  requires_lawyer_confirmation: true
}

const AMOUNT_PATTERN = /(?:人民币|￥)?\s*\d[\d,]*(?:\.\d+)?\s*(?:元|万元|亿元)/g
const PAYABLE_MARKERS = /尚欠|欠付|拖欠|未付|未支付|应付|应支付|尾款|剩余(?:货款|价款|款项)/
const UNCERTAIN_MARKERS = /待确认|待核实|无法确认|金额不明|金额存在争议|付款性质存在争议/
const FORBIDDEN_CLAIM_MARKERS = /利息|违约金|律师费|保全费|担保费|鉴定费/

function normalizeAmount(value: string) {
  return value.replace(/人民币|￥|\s|,/g, '')
}

function paymentLabel(text: string, amount: string) {
  const escaped = amount.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const after = text.match(new RegExp(`${escaped}([^，。；;]{0,10}(?:设备款|货款|价款|合同款|尾款|款项))`))?.[1]
  if (after) return after.replace(/^(?:的|之)/, '')
  const before = text.match(new RegExp(`(?:尚欠|欠付|拖欠|未付|未支付|应付|应支付|尾款|剩余)([^，。；;]{0,10}?)(?:为|共计|合计)?${escaped}`))?.[1]
  return before?.replace(/^(?:的|之)/, '') || '款项'
}

function isPaidAmount(text: string, rawAmount: string) {
  const amountIndex = text.indexOf(rawAmount)
  if (amountIndex < 0) return false
  const prefix = text.slice(0, amountIndex)
  const segmentStart = Math.max(...['\n', '，', '。', '；', ';', '与'].map((delimiter) => prefix.lastIndexOf(delimiter)))
  const localPrefix = prefix.slice(segmentStart + 1)
  return /已(?:经)?支付|已付|累计(?:已)?支付|实付/.test(localPrefix)
}

export function buildRuntimeDocumentClaims(scopes: DocumentArgumentScope[]): RuntimeDocumentClaim[] {
  const claims: RuntimeDocumentClaim[] = []
  const seen = new Set<string>()

  for (const scope of scopes) {
    if (!scope.issue.issue_id || !scope.argument.argument_id || scope.facts.length === 0 || scope.laws.length === 0) continue
    const source = {
      source_issue_ids: [scope.issue.issue_id],
      source_fact_ids: scope.facts.map((fact) => fact.fact_id),
      source_law_ids: scope.laws.map((law) => law.law_id),
      source_argument_ids: [scope.argument.argument_id],
      requires_lawyer_confirmation: true as const,
    }

    for (const fact of scope.facts) {
      const factText = `${fact.title}\n${fact.description}`
      if (!PAYABLE_MARKERS.test(factText) || UNCERTAIN_MARKERS.test(factText) || FORBIDDEN_CLAIM_MARKERS.test(factText)) continue
      const amounts = factText.match(AMOUNT_PATTERN) || []
      for (const rawAmount of amounts) {
        if (isPaidAmount(factText, rawAmount)) continue
        const amount = normalizeAmount(rawAmount)
        const label = paymentLabel(factText, amount)
        const text = `请求判令被告向原告支付${amount}${label}。`
        if (seen.has(text)) continue
        seen.add(text)
        claims.push({ ...source, source_fact_ids: [fact.fact_id], text })
      }
    }
  }

  const firstSupportedScope = scopes.find((scope) => (
    Boolean(scope.issue.issue_id)
    && Boolean(scope.argument.argument_id)
    && scope.facts.length > 0
    && scope.laws.length > 0
  ))
  if (firstSupportedScope) {
    claims.push({
      text: '请求判令本案诉讼费用由被告承担。',
      source_issue_ids: [firstSupportedScope.issue.issue_id],
      source_fact_ids: firstSupportedScope.facts.map((fact) => fact.fact_id),
      source_law_ids: firstSupportedScope.laws.map((law) => law.law_id),
      source_argument_ids: [firstSupportedScope.argument.argument_id],
      requires_lawyer_confirmation: true,
    })
  }

  return claims
}

export class DocumentClaimBuilder {
  build(scopes: DocumentArgumentScope[]) {
    return buildRuntimeDocumentClaims(scopes)
  }
}

export default DocumentClaimBuilder
