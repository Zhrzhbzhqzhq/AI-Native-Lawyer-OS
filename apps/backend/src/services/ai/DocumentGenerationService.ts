import ProviderManager from '../../ai/providerManager'
import { buildComplaintSectionsPrompt } from './AIPromptTemplates'
import { validateComplaintSections } from './AIOutputValidator'
import { parseAIJson } from './parseAIJson'
import type { DocumentContext } from '../documentDraftService'
import { projectComplaintSections } from '../documentProfessionalProjection'
import { buildRuntimeDocumentClaims, type RuntimeDocumentClaim } from '../document_claim_builder'
import { projectDocumentParties } from '../document_party_projection'

export const DOCUMENT_PLACEHOLDER = '【待律师补充】'
export const DOCUMENT_CLAIMS_PLACEHOLDER = '【待律师根据已确认 Argument 和案件目标补充】'
export const DOCUMENT_COURT_PLACEHOLDER = '【待律师补充：受理法院】'

export type DocumentReasoningScope = {
  goal: { document_type: 'complaint'; side: 'unknown'; purpose: string; lawyer_instruction: string }
  matter_identity: {
    matter_id: string
    title: string
    description: string
    verified_parties: { plaintiff: string; defendant: string }
    court: string
    case_number: string
    stage: string
  }
  case_understanding: DocumentContext['case_understanding']
  material_sources: DocumentContext['material_sources']
  unavailable_material_sources: DocumentContext['unavailable_material_sources']
  claims: RuntimeDocumentClaim[]
  argument_sections: Array<{
    argument_id: string
    issue: { issue_id: string; title: string; description: string }
    position: string
    reasoning: string
    response: string
    conclusion: string
    usable_facts: Array<{ fact_id: string; title: string; description: string }>
    usable_laws: Array<{ law_id: string; title: string; citation: string; rule_content: string; application: string }>
    evidences: Array<{ evidence_id: string; fact_id: string; title: string; purpose: string }>
    internal_constraints: { counter_argument: string; risk: string; law_limitations: Array<{ law_id: string; limitations: string }> }
  }>
  missing_required_fields: string[]
}

export type ComplaintSections = {
  document_type: 'complaint'
  title: string
  parties: { plaintiff: string; defendant: string }
  claims: RuntimeDocumentClaim[]
  facts: Array<{ text: string; source_fact_ids: string[]; source_evidence_ids: string[] }>
  reasoning: Array<{ issue_id: string; argument_id: string; position: string; analysis: string; source_fact_ids: string[]; source_law_ids: string[] }>
  legal_basis: Array<{ citation: string; text: string; source_law_id: string }>
  evidence_reference: Array<{ evidence_id: string; title: string; purpose: string }>
  conclusion: string
  court: string
  signature: string
  date: string
}

export type DocumentGenerationResult =
  | { ok: true; sections: ComplaintSections; mode: 'ai_generated' | 'ai_retry_generated'; attempts: number }
  | { ok: false; reason: string; attempts: number }

type Generator = { generate(promptPack: any): Promise<any> }

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)))
}

export function buildDocumentReasoningScope(context: DocumentContext): DocumentReasoningScope {
  const claims = buildRuntimeDocumentClaims(context.argument_scopes, context.lawyer_instruction)
  const parties = projectDocumentParties(context.case_understanding)
  return {
    goal: {
      document_type: 'complaint',
      side: 'unknown',
      purpose: '依据已确认 Formal Argument 组织一份供律师审核的民事起诉状草稿',
      lawyer_instruction: context.lawyer_instruction,
    },
    matter_identity: {
      matter_id: context.matter.matter_id,
      title: context.matter.title,
      description: context.matter.description,
      verified_parties: parties,
      court: '',
      case_number: '',
      stage: '',
    },
    case_understanding: context.case_understanding,
    material_sources: context.material_sources,
    unavailable_material_sources: context.unavailable_material_sources,
    claims,
    argument_sections: context.argument_scopes.map((item) => ({
      argument_id: item.argument.argument_id,
      issue: { issue_id: item.issue.issue_id, title: item.issue.title, description: item.issue.description },
      position: item.argument.position || item.argument.title,
      reasoning: item.argument.reasoning,
      response: item.argument.response,
      conclusion: item.argument.conclusion,
      usable_facts: item.facts.map((fact) => ({ fact_id: fact.fact_id, title: fact.title, description: fact.description })),
      usable_laws: item.laws.map((law) => ({
        law_id: law.law_id,
        title: law.title,
        citation: law.citation,
        rule_content: law.rule_content || law.raw_description,
        application: law.application,
      })),
      evidences: item.facts.flatMap((fact) => fact.evidences.map((evidence) => ({
        evidence_id: evidence.evidence_id,
        fact_id: fact.fact_id,
        title: evidence.title,
        purpose: evidence.description,
      }))),
      internal_constraints: {
        counter_argument: item.argument.counter_argument,
        risk: item.argument.risk,
        law_limitations: item.laws.map((law) => ({ law_id: law.law_id, limitations: law.limitations })),
      },
    })),
    missing_required_fields: [
      'parties',
      'court',
      'case_number',
      ...(!claims.some((claim) => /\d[\d,]*(?:\.\d+)?(?:元|万元|亿元)/.test(claim.text)) ? ['amount'] : []),
      'date',
      'signature',
    ],
  }
}

function responseBody(response: any) {
  return response && response.response !== undefined ? response.response : response
}

function finishReason(response: any) {
  const body = responseBody(response)
  const reason = response?.finish_reason
    ?? body?.choices?.[0]?.finish_reason
    ?? body?.data?.choices?.[0]?.finish_reason
    ?? body?.stop_reason
    ?? response?.stop_reason
    ?? null
  return reason === 'max_tokens' ? 'length' : reason
}

function extractSections(response: any): ComplaintSections | null {
  const body = responseBody(response)
  if (body && typeof body === 'object' && !Array.isArray(body) && body.document_type === 'complaint') return body
  const content = body?.choices?.[0]?.message?.content
    ?? body?.data?.choices?.[0]?.message?.content
    ?? (Array.isArray(body?.content) ? body.content.map((part: any) => typeof part === 'string' ? part : part?.text || '').join('\n') : body)
  if (typeof content !== 'string') return null
  const parsed = parseAIJson(content).data
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as ComplaintSections : null
}

export function renderComplaintSections(sections: ComplaintSections) {
  return projectComplaintSections(sections)
}

export class DocumentGenerationService {
  constructor(private generator?: Generator) {}

  async generate(matterId: string, scope: DocumentReasoningScope): Promise<DocumentGenerationResult> {
    const generator = this.generator || ProviderManager.getAdapter()
    let lastReason = 'document_generation_failed'
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const promptPack = {
          prompt_version: 'document-reasoning-v1',
          task: 'generate_document_sections',
          matter_id: matterId,
          max_completion_tokens: 6000,
          context_pack: scope,
          user_prompt: buildComplaintSectionsPrompt(scope, { compactRetry: attempt === 1 }),
          created_at: new Date().toISOString(),
        }
        const response = await generator.generate(promptPack)
        if (finishReason(response) === 'length') {
          lastReason = 'document_response_truncated'
          continue
        }
        const sections = extractSections(response)
        if (!sections) {
          lastReason = 'document_json_parse_failed'
          continue
        }
        sections.claims = scope.claims
        if (scope.matter_identity.verified_parties.plaintiff) sections.parties.plaintiff = scope.matter_identity.verified_parties.plaintiff
        if (scope.matter_identity.verified_parties.defendant) sections.parties.defendant = scope.matter_identity.verified_parties.defendant
        const validation = validateComplaintSections(sections, scope)
        if (!validation.ok) {
          lastReason = validation.errors[0] || 'document_sections_invalid'
          continue
        }
        return { ok: true, sections, mode: attempt === 0 ? 'ai_generated' : 'ai_retry_generated', attempts: attempt + 1 }
      } catch (error: any) {
        lastReason = String(error?.code || error?.message || 'document_provider_failed')
      }
    }
    return { ok: false, reason: lastReason, attempts: 2 }
  }
}

export function sourceIdsFromScope(scope: DocumentReasoningScope) {
  return {
    argumentIds: unique(scope.argument_sections.map((item) => item.argument_id)),
    issueIds: unique(scope.argument_sections.map((item) => item.issue.issue_id)),
    factIds: unique(scope.argument_sections.flatMap((item) => item.usable_facts.map((fact) => fact.fact_id))),
    lawIds: unique(scope.argument_sections.flatMap((item) => item.usable_laws.map((law) => law.law_id))),
  }
}

export default DocumentGenerationService
