import type { DocumentArgumentScope } from './document_context_builder'

type RuntimeClaimObjective = 'continue_performance' | 'terminate_contract' | 'pay_confirmed_amount'
export type RuntimeClaimRole = 'primary' | 'alternative' | 'ancillary'

export type RuntimeDocumentClaim = {
  text: string
  claim_role?: RuntimeClaimRole
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
const OBJECTIVE_LINE_PATTERN = /^\s*(诉讼目标|备选诉讼目标|主位请求|备位请求)：\s*(.*?)\s*$/

function parseRuntimeClaimObjectives(lawyerInstruction?: string) {
  const objectives: Array<{ objective: RuntimeClaimObjective; claim_role: RuntimeClaimRole }> = []
  let controlled = false
  const add = (objective: RuntimeClaimObjective, claim_role: RuntimeClaimRole) => {
    if (!objectives.some((item) => item.objective === objective && item.claim_role === claim_role)) {
      objectives.push({ objective, claim_role })
    }
  }

  for (const line of String(lawyerInstruction || '').split(/\r?\n/)) {
    const match = line.match(OBJECTIVE_LINE_PATTERN)
    if (!match) continue
    controlled = true
    const claimRole: RuntimeClaimRole = match[1] === '备选诉讼目标' || match[1] === '备位请求'
      ? 'alternative'
      : 'primary'
    const value = match[2]
    const terminatesContract = /terminate_contract|解除合同/.test(value)
    if (/continue_performance|继续履行|交付房屋/.test(value) && !/无法(?:继续履行|交付房屋)/.test(value)) {
      add('continue_performance', claimRole)
    }
    if (terminatesContract) add('terminate_contract', claimRole)
    if (/pay_confirmed_amount|支付明确欠款|支付已确认欠款/.test(value)) add('pay_confirmed_amount', claimRole)
  }

  return { controlled, objectives }
}

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

function sourceForScope(scope: DocumentArgumentScope) {
  return {
    source_issue_ids: [scope.issue.issue_id],
    source_fact_ids: scope.facts.map((fact) => fact.fact_id),
    source_law_ids: scope.laws.map((law) => law.law_id),
    source_argument_ids: [scope.argument.argument_id],
    requires_lawyer_confirmation: true as const,
  }
}

function withClaimRole(
  claim: Omit<RuntimeDocumentClaim, 'claim_role'>,
  claimRole: RuntimeClaimRole,
): RuntimeDocumentClaim {
  const runtimeClaim = claim as RuntimeDocumentClaim
  Object.defineProperty(runtimeClaim, 'claim_role', {
    value: claimRole,
    enumerable: false,
    configurable: true,
  })
  return runtimeClaim
}

function scopeSupportsObjective(scope: DocumentArgumentScope, objective: Exclude<RuntimeClaimObjective, 'pay_confirmed_amount'>) {
  if (!scope.issue.issue_id || !scope.argument.argument_id || scope.facts.length === 0 || scope.laws.length === 0) return false
  const issueAndArgument = [
    scope.issue.title,
    scope.issue.description,
    scope.argument.title,
    scope.argument.position,
    scope.argument.reasoning,
    scope.argument.conclusion,
  ].join('\n')
  const legalSupport = scope.laws.map((law) => [
    law.title,
    law.citation,
    law.description,
    law.rule_content,
    law.application,
  ].join('\n')).join('\n')
  const marker = objective === 'continue_performance'
    ? /继续履行|交付房屋|房屋交付/
    : /解除合同|合同解除|解除权/
  return marker.test(issueAndArgument) && marker.test(legalSupport)
}

function continuePerformanceClaimText(scope: DocumentArgumentScope) {
  const scopeText = [
    scope.issue.title,
    scope.issue.description,
    scope.argument.title,
    scope.argument.position,
    ...scope.facts.flatMap((fact) => [fact.title, fact.description]),
  ].join('\n')
  return /房屋交付|交付房屋/.test(scopeText)
    ? '请求判令被告继续履行合同约定的房屋交付义务。'
    : '请求判令被告继续履行合同义务。'
}

function appendMonetaryClaims(claims: RuntimeDocumentClaim[], seen: Set<string>, scopes: DocumentArgumentScope[], claimRole: RuntimeClaimRole) {
  for (const scope of scopes) {
    if (!scope.issue.issue_id || !scope.argument.argument_id || scope.facts.length === 0 || scope.laws.length === 0) continue
    const source = sourceForScope(scope)

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
        claims.push(withClaimRole({ ...source, source_fact_ids: [fact.fact_id], text }, claimRole))
      }
    }
  }
}

export function buildRuntimeDocumentClaims(scopes: DocumentArgumentScope[], lawyerInstruction?: string): RuntimeDocumentClaim[] {
  const claims: RuntimeDocumentClaim[] = []
  const seen = new Set<string>()
  const parsed = parseRuntimeClaimObjectives(lawyerInstruction)

  if (!parsed.controlled) {
    appendMonetaryClaims(claims, seen, scopes, 'primary')
  } else {
    for (const { objective, claim_role } of parsed.objectives) {
      if (objective === 'pay_confirmed_amount') {
        appendMonetaryClaims(claims, seen, scopes, claim_role)
        continue
      }
      const scope = scopes.find((candidate) => scopeSupportsObjective(candidate, objective))
      if (!scope) continue
      const text = objective === 'continue_performance'
        ? continuePerformanceClaimText(scope)
        : '请求判令解除原告与被告签订的合同。'
      if (!seen.has(text)) {
        seen.add(text)
        claims.push(withClaimRole({ ...sourceForScope(scope), text }, claim_role))
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
    claims.push(withClaimRole({
      text: '请求判令本案诉讼费用由被告承担。',
      source_issue_ids: [firstSupportedScope.issue.issue_id],
      source_fact_ids: firstSupportedScope.facts.map((fact) => fact.fact_id),
      source_law_ids: firstSupportedScope.laws.map((law) => law.law_id),
      source_argument_ids: [firstSupportedScope.argument.argument_id],
      requires_lawyer_confirmation: true,
    }, 'ancillary'))
  }

  return claims
}

export class DocumentClaimBuilder {
  build(scopes: DocumentArgumentScope[], lawyerInstruction?: string) {
    return buildRuntimeDocumentClaims(scopes, lawyerInstruction)
  }
}

export default DocumentClaimBuilder
