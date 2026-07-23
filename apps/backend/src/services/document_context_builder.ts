import {
  parseFormalArgument,
  parseFormalLaw,
  type FormalSemanticEncoding,
  type FormalSemanticRecovery,
} from './formalSemanticCodec'
import type { CaseUnderstandingResult } from './context_engine/case_understanding_schema'
import SafeMaterialReader from './context_engine/safe_material_reader'

export type DocumentCaseUnderstanding = Pick<
  CaseUnderstandingResult,
  'identity' | 'actors' | 'narrative' | 'conflicts' | 'timeline'
>

export type CaseUnderstandingReader = {
  latest(matterId: string): Promise<{
    matterId: string
    status: string
    understanding: CaseUnderstandingResult
  }>
}

export type DocumentMaterialSource = {
  material_id: string
  title: string
  source: string
  content: string
  contentLength: number
}

export type UnavailableDocumentMaterialSource = {
  material_id: string
  title: string
  reason: string
}

export type DocumentContextEvidence = {
  evidence_id: string
  title: string
  description: string
  status: string
  material: { material_id: string; title: string } | null
}

export type DocumentContextFact = {
  fact_id: string
  title: string
  description: string
  status: string
  evidences: DocumentContextEvidence[]
}

export type DocumentContextIssue = {
  issue_id: string
  title: string
  description: string
  status: string
}

export type DocumentContextLaw = {
  law_id: string
  title: string
  citation: string
  description: string
  rule_content: string
  application: string
  limitations: string
  jurisdiction: string
  source_reference: string
  semantic_encoding: FormalSemanticEncoding
  semantic_recovery: FormalSemanticRecovery
  raw_description: string
  status: string
}

export type DocumentArgumentScope = {
  argument: {
    argument_id: string
    title: string
    description: string
    conclusion: string
    position: string
    reasoning: string
    counter_argument: string
    response: string
    risk: string
    semantic_encoding: FormalSemanticEncoding
    semantic_recovery: FormalSemanticRecovery
    raw_description: string
    status: string
  }
  issue: DocumentContextIssue
  facts: DocumentContextFact[]
  laws: DocumentContextLaw[]
}

export type DocumentContext = {
  matter: { matter_id: string; title: string; description: string }
  case_understanding: DocumentCaseUnderstanding | null
  material_sources: DocumentMaterialSource[]
  unavailable_material_sources: UnavailableDocumentMaterialSource[]
  document_type: string
  lawyer_instruction: string
  evidences: DocumentContextEvidence[]
  facts: DocumentContextFact[]
  issues: DocumentContextIssue[]
  laws: DocumentContextLaw[]
  arguments: DocumentArgumentScope['argument'][]
  argument_scopes: DocumentArgumentScope[]
  excluded_scopes: Array<{ argument_id: string; reasons: string[] }>
}

export type DocumentContextSourceRows = {
  matter_id: string
  document_type: string
  lawyer_instruction: string
  matter: any
  caseUnderstanding?: DocumentCaseUnderstanding | null
  caseUnderstandingMatterId?: string | null
  evidences: any[]
  facts: any[]
  issues: any[]
  laws: any[]
  argumentsList: any[]
  factEvidenceLinks: any[]
  issueFactLinks: any[]
  lawIssueLinks: any[]
  argumentFactLinks: any[]
  argumentIssueLinks: any[]
  argumentLawLinks: any[]
}

export const FORMAL_SOURCE_STATUSES = ['active', 'published', 'completed', 'final', 'confirmed']

function uniqueStrings(values: unknown[]) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)))
}

function projectCaseUnderstanding(value: DocumentCaseUnderstanding | null | undefined): DocumentCaseUnderstanding | null {
  if (!value) return null
  return {
    identity: value.identity,
    actors: value.actors,
    narrative: value.narrative,
    conflicts: value.conflicts,
    timeline: value.timeline,
  }
}

export function buildDocumentContext(input: DocumentContextSourceRows): DocumentContext {
  const matterId = String(input.matter_id)
  const caseUnderstanding = input.caseUnderstanding
    && String(input.caseUnderstandingMatterId || matterId) === matterId
    ? projectCaseUnderstanding(input.caseUnderstanding)
    : null
  const allowed = (row: any) => String(row?.matter_id || '') === matterId && FORMAL_SOURCE_STATUSES.includes(String(row?.status || '').toLowerCase())
  const evidences = input.evidences.filter(allowed)
  const facts = input.facts.filter(allowed)
  const issues = input.issues.filter(allowed)
  const laws = input.laws.filter(allowed)
  const argumentsList = input.argumentsList.filter(allowed)
  const evidenceById = new Map(evidences.map((row) => [String(row.evidence_id), row]))
  const factById = new Map(facts.map((row) => [String(row.fact_id), row]))
  const issueById = new Map(issues.map((row) => [String(row.issue_id), row]))
  const lawById = new Map(laws.map((row) => [String(row.law_id), row]))
  const argumentScopes: DocumentArgumentScope[] = []
  const excludedScopes: DocumentContext['excluded_scopes'] = []

  for (const argument of argumentsList) {
    const argumentId = String(argument.argument_id)
    const reasons: string[] = []
    const argumentSemantic = parseFormalArgument(argument.description)
    if (['invalid-v2', 'unsupported-version', 'wrong-object-type'].includes(argumentSemantic.encoding)) {
      reasons.push(`argument_semantic_${argumentSemantic.encoding}`)
    }
    const linkedIssueIds = uniqueStrings(input.argumentIssueLinks.filter((link) => String(link.argument_id) === argumentId).map((link) => link.issue_id))
    const directIssueId = String(argument.issue_id || '')
    if (linkedIssueIds.length !== 1 || (directIssueId && linkedIssueIds[0] !== directIssueId)) reasons.push('argument_must_have_one_issue')
    const issueId = linkedIssueIds.length === 1 ? linkedIssueIds[0] : ''
    const issue = issueById.get(issueId)
    if (!issue) reasons.push('formal_issue_not_found')

    const factIds = uniqueStrings(input.argumentFactLinks.filter((link) => String(link.argument_id) === argumentId).map((link) => link.fact_id))
    if (factIds.length === 0) reasons.push('argument_facts_required')
    const issueFactIds = new Set(input.issueFactLinks.filter((link) => String(link.issue_id) === issueId).map((link) => String(link.fact_id)))
    if (factIds.some((factId) => !issueFactIds.has(factId))) reasons.push('source_fact_outside_issue')
    if (factIds.some((factId) => !factById.has(factId))) reasons.push('formal_fact_not_found')

    const scopedFacts: DocumentContextFact[] = []
    for (const factId of factIds) {
      const fact = factById.get(factId)
      if (!fact) continue
      const factEvidences = uniqueStrings(input.factEvidenceLinks.filter((link) => String(link.fact_id) === factId).map((link) => link.evidence_id))
        .map((evidenceId) => evidenceById.get(evidenceId))
        .filter(Boolean)
        .map((evidence: any) => ({
          evidence_id: String(evidence.evidence_id),
          title: String(evidence.title || ''),
          description: String(evidence.description || ''),
          status: String(evidence.status || ''),
          material: evidence.material
            ? { material_id: String(evidence.material.material_id || evidence.material_id || ''), title: String(evidence.material.title || '') }
            : null,
        }))
      if (factEvidences.length === 0) reasons.push('fact_without_formal_evidence')
      scopedFacts.push({
        fact_id: factId,
        title: String(fact.title || ''),
        description: String(fact.description || ''),
        status: String(fact.status || ''),
        evidences: factEvidences,
      })
    }

    const lawIds = uniqueStrings(input.argumentLawLinks.filter((link) => String(link.argument_id) === argumentId).map((link) => link.law_id))
    if (lawIds.length === 0) reasons.push('argument_laws_required')
    const issueLawIds = new Set(input.lawIssueLinks.filter((link) => String(link.issue_id) === issueId).map((link) => String(link.law_id)))
    if (lawIds.some((lawId) => !issueLawIds.has(lawId))) reasons.push('source_law_outside_issue')
    if (lawIds.some((lawId) => !lawById.has(lawId))) reasons.push('formal_law_not_found')
    const scopedLaws: DocumentContextLaw[] = lawIds.map((lawId) => lawById.get(lawId)).filter(Boolean).flatMap((law: any) => {
      const semantic = parseFormalLaw(law.description)
      if (['invalid-v2', 'unsupported-version', 'wrong-object-type'].includes(semantic.encoding)) {
        reasons.push(`law_semantic_${semantic.encoding}`)
        return []
      }
      return [{
        law_id: String(law.law_id),
        title: String(law.title || ''),
        citation: String(law.citation || ''),
        description: semantic.parsed
          ? [semantic.fields.rule_content, semantic.fields.application].filter(Boolean).join('\n')
          : semantic.raw_description,
        rule_content: semantic.fields.rule_content,
        application: semantic.fields.application,
        limitations: semantic.fields.limitations,
        jurisdiction: semantic.fields.jurisdiction,
        source_reference: semantic.fields.source_reference,
        semantic_encoding: semantic.encoding,
        semantic_recovery: semantic.semantic_recovery,
        raw_description: semantic.raw_description,
        status: String(law.status || ''),
      }]
    })

    if (reasons.length > 0 || !issue) {
      excludedScopes.push({ argument_id: argumentId, reasons: uniqueStrings(reasons) })
      continue
    }
    argumentScopes.push({
      argument: {
        argument_id: argumentId,
        title: String(argument.title || ''),
        description: argumentSemantic.parsed
          ? [argumentSemantic.fields.position, argumentSemantic.fields.reasoning, argumentSemantic.fields.response].filter(Boolean).join('\n')
          : argumentSemantic.raw_description,
        conclusion: String(argument.conclusion || ''),
        position: argumentSemantic.fields.position,
        reasoning: argumentSemantic.parsed ? argumentSemantic.fields.reasoning : argumentSemantic.raw_description,
        counter_argument: argumentSemantic.fields.counter_argument,
        response: argumentSemantic.fields.response,
        risk: argumentSemantic.fields.risk,
        semantic_encoding: argumentSemantic.encoding,
        semantic_recovery: argumentSemantic.semantic_recovery,
        raw_description: argumentSemantic.raw_description,
        status: String(argument.status || ''),
      },
      issue: {
        issue_id: issueId,
        title: String((issue as any).title || ''),
        description: String((issue as any).description || ''),
        status: String((issue as any).status || ''),
      },
      facts: scopedFacts,
      laws: scopedLaws,
    })
  }

  const uniqueBy = <T>(rows: T[], idOf: (row: T) => string) => Array.from(new Map(rows.map((row) => [idOf(row), row])).values())
  return {
    matter: {
      matter_id: matterId,
      title: String(input.matter?.title || ''),
      description: String(input.matter?.description || ''),
    },
    case_understanding: caseUnderstanding,
    material_sources: [],
    unavailable_material_sources: [],
    document_type: String(input.document_type || 'complaint'),
    lawyer_instruction: String(input.lawyer_instruction || ''),
    evidences: uniqueBy(argumentScopes.flatMap((scope) => scope.facts.flatMap((fact) => fact.evidences)), (row) => row.evidence_id),
    facts: uniqueBy(argumentScopes.flatMap((scope) => scope.facts), (row) => row.fact_id),
    issues: uniqueBy(argumentScopes.map((scope) => scope.issue), (row) => row.issue_id),
    laws: uniqueBy(argumentScopes.flatMap((scope) => scope.laws), (row) => row.law_id),
    arguments: argumentScopes.map((scope) => scope.argument),
    argument_scopes: argumentScopes,
    excluded_scopes: excludedScopes,
  }
}

export class DocumentContextBuilder {
  constructor(
    private readonly caseUnderstandingReader?: CaseUnderstandingReader,
    private readonly materialReader: Pick<SafeMaterialReader, 'read'> = new SafeMaterialReader(),
  ) {}

  async build(input: DocumentContextSourceRows): Promise<DocumentContext> {
    let contextInput = input
    if (input.caseUnderstanding === undefined && this.caseUnderstandingReader) {
      try {
        const latest = await this.caseUnderstandingReader.latest(String(input.matter_id))
        contextInput = {
          ...input,
          caseUnderstanding: latest.status === 'completed' ? latest.understanding : null,
          caseUnderstandingMatterId: latest.matterId,
        }
      } catch {
        contextInput = { ...input, caseUnderstanding: null }
      }
    }

    const context = buildDocumentContext(contextInput)
    const matterId = String(input.matter_id)
    const reachableEvidenceIds = new Set(context.evidences.map((evidence) => evidence.evidence_id))
    const materialRows = new Map<string, any>()
    for (const evidence of input.evidences) {
      if (!reachableEvidenceIds.has(String(evidence?.evidence_id || ''))) continue
      if (String(evidence?.matter_id || '') !== matterId || !evidence?.material) continue
      const material = evidence.material
      if (material.matter_id && String(material.matter_id) !== matterId) continue
      const materialId = String(material.material_id || evidence.material_id || '')
      if (materialId) materialRows.set(materialId, material)
    }

    for (const [materialId, material] of materialRows) {
      try {
        const read = await this.materialReader.read(String(material.storage_uri || ''))
        context.material_sources.push({
          material_id: materialId,
          title: String(material.title || ''),
          source: String(material.source || ''),
          content: read.content,
          contentLength: read.contentLength,
        })
      } catch (error) {
        const candidate = error as { code?: unknown; message?: unknown }
        context.unavailable_material_sources.push({
          material_id: materialId,
          title: String(material.title || ''),
          reason: String(candidate?.code || candidate?.message || 'material_file_unavailable'),
        })
      }
    }
    return context
  }
}

export default DocumentContextBuilder
