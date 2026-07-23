import type { ComplaintSections } from './ai/DocumentGenerationService'
import type { DocumentContext } from './documentDraftService'
import { buildRuntimeDocumentClaims } from './document_claim_builder'
import { projectDocumentParties } from './document_party_projection'

export const PROFESSIONAL_CLAIMS_PLACEHOLDER = '【待律师确认：根据已确认的案件目标和法律论证填写具体诉讼请求】'

type ProjectionModel = {
  title: string
  plaintiff: string
  defendant: string
  claims: string[]
  facts: Array<{ id: string; text: string }>
  arguments: Array<{ id: string; position: string; reasoning: string; response: string; conclusion: string }>
  laws: Array<{ id: string; citation: string; rule: string }>
  evidences: Array<{ id: string; title: string }>
  conclusion: string
  court: string
  signature: string
  date: string
}

const ANALYSIS_LABELS = /(?:^|[\n\r]\s*|[①②③④⑤⑥⑦⑧⑨]\s*)(?:争议焦点|本方主张|论证|回应|阶段性结论|风险与薄弱点|可能抗辩|抗辩回应|已确认事实|适用法律|法律推理|当前阶段性结论|现有来源|正式来源|已确认来源|Issue|Position|Confirmed Facts|Applicable Laws|Legal Reasoning|Counter Argument|Response|Risk|Limitations|Conclusion|Internal Constraints|Scope)\s*[:：]\s*/gi
const RUNTIME_HINTS = [
  /具体内容需核对材料原文[。；;]?/g,
  /具体时间需核对[。；;]?/g,
  /需律师进一步审核[。；;]?/g,
  /真实性、合法性、关联性(?:及证明力)?(?:由|需)[^。；;]*[。；;]?/g,
  /证明力由法院认定[。；;]?/g,
]

function cleanText(value: unknown) {
  let text = String(value || '').replace(ANALYSIS_LABELS, ' ')
  for (const pattern of RUNTIME_HINTS) text = text.replace(pattern, '')
  return text
    .replace(/[①②③④⑤⑥⑦⑧⑨]\s*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([，。；：])/g, '$1')
    .trim()
}

function uniqueById<T extends { id: string }>(values: T[]) {
  const seen = new Set<string>()
  return values.filter((value) => {
    if (!value.id || seen.has(value.id)) return false
    seen.add(value.id)
    return true
  })
}

function uniqueText(values: string[]) {
  const seen = new Set<string>()
  return values.map(cleanText).filter((value) => {
    const normalized = value.replace(/[，。；：、\s]/g, '')
    if (!normalized || seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

function renderProfessionalComplaint(model: ProjectionModel) {
  const claims = uniqueText(model.claims).map((claim, index) => {
    if (claim === PROFESSIONAL_CLAIMS_PLACEHOLDER || /待律师根据已确认\s*Argument/.test(claim)) return PROFESSIONAL_CLAIMS_PLACEHOLDER
    return `${index + 1}. ${claim.replace(/^【待律师(?:确认|补充)[^】]*】\s*/, '')}`
  })
  if (claims.length === 0) claims.push(PROFESSIONAL_CLAIMS_PLACEHOLDER)

  const factParagraphs = uniqueText(uniqueById(model.facts).map((fact) => fact.text))
  const knownFacts = new Set(factParagraphs.map((fact) => fact.replace(/[，。；：、\s]/g, '')))
  const argumentParagraphs = uniqueText(uniqueById(model.arguments).flatMap((argument) => {
    const candidates = [argument.position, argument.reasoning, argument.response]
    return candidates.filter((candidate) => !knownFacts.has(cleanText(candidate).replace(/[，。；：、\s]/g, '')))
  }))
  const conclusions = uniqueText([
    ...model.arguments.map((argument) => argument.conclusion),
    model.conclusion,
  ])
  const conclusion = conclusions.join('；').replace(/；([。！？])/g, '$1')

  const laws = uniqueById(model.laws).filter((law, index, values) => (
    values.findIndex((candidate) => cleanText(candidate.citation) === cleanText(law.citation)) === index
  ))
  const lawLines = laws.map((law, index) => {
    const citation = cleanText(law.citation)
    const rule = cleanText(law.rule)
    return `${index + 1}. ${citation}${rule ? `：${rule}` : ''}`
  })
  const evidenceLines = uniqueById(model.evidences).map((evidence, index) => `${index + 1}. ${cleanText(evidence.title)}`)

  const factsAndReasons = [...factParagraphs, ...argumentParagraphs, conclusion].filter(Boolean)
  return [
    cleanText(model.title) || '民事起诉状',
    '', '原告：', cleanText(model.plaintiff) || '【待律师补充】',
    '', '被告：', cleanText(model.defendant) || '【待律师补充】',
    '', '诉讼请求：', ...claims,
    '', '事实与理由：', ...factsAndReasons,
    ...(lawLines.length ? ['', '法律依据：', ...lawLines] : []),
    ...(evidenceLines.length ? ['', '证据和证据来源：', ...evidenceLines] : []),
    '', '此致', cleanText(model.court) || '【待律师补充：受理法院】',
    '', '具状人：', cleanText(model.signature) || '【待律师补充】',
    '', '日期：', cleanText(model.date) || '【待律师补充】',
  ].filter((line, index, rows) => line !== '' || rows[index - 1] !== '').join('\n')
}

export function projectComplaintSections(sections: ComplaintSections) {
  return renderProfessionalComplaint({
    title: sections.title,
    plaintiff: sections.parties.plaintiff,
    defendant: sections.parties.defendant,
    claims: sections.claims.map((claim) => claim.text),
    facts: sections.facts.flatMap((fact) => fact.source_fact_ids.map((id) => ({ id, text: fact.text }))),
    arguments: sections.reasoning.map((item) => ({
      id: item.argument_id,
      position: item.position,
      reasoning: item.analysis,
      response: '',
      conclusion: '',
    })),
    laws: sections.legal_basis.map((law) => ({ id: law.source_law_id, citation: law.citation, rule: law.text })),
    evidences: sections.evidence_reference.map((evidence) => ({ id: evidence.evidence_id, title: evidence.title })),
    conclusion: sections.conclusion,
    court: sections.court,
    signature: sections.signature,
    date: sections.date,
  })
}

export function projectComplaintContext(context: DocumentContext) {
  const parties = projectDocumentParties(context.case_understanding)
  return renderProfessionalComplaint({
    title: `${context.matter.title || '案件'}民事起诉状`,
    plaintiff: parties.plaintiff,
    defendant: parties.defendant,
    claims: buildRuntimeDocumentClaims(context.argument_scopes).map((claim) => claim.text),
    facts: context.facts.map((fact) => ({ id: fact.fact_id, text: [fact.title, fact.description].filter(Boolean).join('：') })),
    arguments: context.argument_scopes.map((scope) => ({
      id: scope.argument.argument_id,
      position: scope.argument.position || scope.argument.title,
      reasoning: scope.argument.reasoning,
      response: scope.argument.response,
      conclusion: scope.argument.conclusion,
    })),
    laws: context.laws.map((law) => ({
      id: law.law_id,
      citation: law.citation || law.title,
      rule: law.semantic_encoding === 'legacy-plain' ? law.raw_description : law.rule_content,
    })),
    evidences: context.evidences.map((evidence) => ({ id: evidence.evidence_id, title: evidence.title })),
    conclusion: '',
    court: '【待律师补充：受理法院】',
    signature: '【待律师补充】',
    date: '【待律师补充】',
  })
}
