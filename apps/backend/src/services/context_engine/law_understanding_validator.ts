import { findLawBoundaryViolation, findLawCitationViolation, validateLaws } from '../ai/AIOutputValidator'
import type { LawUnderstandingIssueScope } from './law_understanding_prompt'

export type LawUnderstandingDraft = {
  title: string
  citation: string
  rule_content: string
  application: string
  limitations: string
  jurisdiction: string
  source_reference: string
  confidence: number | null
  ai_reasoning: string
  source_issue_ids: string[]
}

export type LawUnderstandingValidationResult =
  | { ok: true; drafts: LawUnderstandingDraft[] }
  | { ok: false; errors: string[] }

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export class LawUnderstandingValidator {
  validate(value: unknown, scopes: LawUnderstandingIssueScope[]): LawUnderstandingValidationResult {
    const source = value && typeof value === 'object' && !Array.isArray(value)
      ? (value as any).law_drafts
      : value
    if (!Array.isArray(source)) return { ok: false, errors: ['law_drafts_required'] }

    const validIssueIds = new Set(scopes.map((scope) => scope.issue.issueId))
    const errors: string[] = []
    const drafts = source.map((item: any, index) => {
      const prefix = `law_drafts[${index}]`
      const title = text(item?.title)
      const citation = text(item?.citation)
      const ruleContent = text(item?.rule_content)
      const application = text(item?.application)
      const limitations = text(item?.limitations)
      const jurisdiction = text(item?.jurisdiction)
      const sourceReference = text(item?.source_reference)
      const aiReasoning = text(item?.ai_reasoning)
      const sourceIssueIds = Array.isArray(item?.source_issue_ids)
        ? Array.from(new Set(item.source_issue_ids.map(text).filter(Boolean))) as string[]
        : []
      if (!title) errors.push(`${prefix}.title_required`)
      if (!citation) errors.push(`${prefix}.citation_required`)
      if (!ruleContent) errors.push(`${prefix}.rule_content_required`)
      if (!application) errors.push(`${prefix}.application_required`)
      if (!limitations) errors.push(`${prefix}.limitations_required`)
      if (!jurisdiction) errors.push(`${prefix}.jurisdiction_required`)
      if (!sourceReference) errors.push(`${prefix}.source_reference_required`)
      if (!aiReasoning) errors.push(`${prefix}.ai_reasoning_required`)
      if (sourceIssueIds.length !== 1 || !validIssueIds.has(sourceIssueIds[0])) errors.push(`${prefix}.source_issue_not_in_scope`)
      if (findLawCitationViolation(citation)) errors.push(`${prefix}.citation_invalid`)
      if (findLawBoundaryViolation(application, limitations)) errors.push(`${prefix}.final_case_conclusion_forbidden`)
      const existingValidation = validateLaws([{ ...item, issue_title: scopes.find((scope) => scope.issue.issueId === sourceIssueIds[0])?.issue.title || '' }])
      if (!existingValidation.ok) errors.push(...existingValidation.errors.map((error) => `${prefix}.${error}`))
      for (const forbidden of ['law_id', 'matter_id', 'status', 'review_status', 'published_law_id', 'published_at']) {
        if (Object.prototype.hasOwnProperty.call(item || {}, forbidden)) errors.push(`${prefix}.${forbidden}_forbidden`)
      }
      const rawConfidence = Number(item?.confidence)
      return {
        title,
        citation,
        rule_content: ruleContent,
        application,
        limitations,
        jurisdiction,
        source_reference: sourceReference,
        confidence: Number.isFinite(rawConfidence) ? Math.max(0, Math.min(1, rawConfidence)) : null,
        ai_reasoning: aiReasoning,
        source_issue_ids: sourceIssueIds,
      }
    })
    return errors.length > 0 ? { ok: false, errors } : { ok: true, drafts }
  }
}

export default LawUnderstandingValidator
