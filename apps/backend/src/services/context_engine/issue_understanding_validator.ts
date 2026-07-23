import type { IssueUnderstandingFactInput } from './issue_understanding_prompt'

export type IssueUnderstandingDraft = {
  title: string
  description: string
  source_fact_ids: string[]
  confidence: number | null
  ai_reasoning: string
}

export type IssueUnderstandingValidationResult =
  | { ok: true; drafts: IssueUnderstandingDraft[] }
  | { ok: false; errors: string[] }

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export class IssueUnderstandingValidator {
  validate(value: unknown, facts: IssueUnderstandingFactInput[]): IssueUnderstandingValidationResult {
    const source = value && typeof value === 'object' && !Array.isArray(value)
      ? (value as any).issue_drafts
      : value
    if (!Array.isArray(source) || source.length === 0) return { ok: false, errors: ['issue_drafts_required'] }

    const evidenceBackedFactIds = new Set(facts.filter((fact) => fact.evidenceSources.length > 0).map((fact) => fact.factId))
    const errors: string[] = []
    const drafts = source.map((item: any, index) => {
      const prefix = `issue_drafts[${index}]`
      const title = text(item?.title)
      const description = text(item?.description)
      const aiReasoning = text(item?.ai_reasoning)
      const sourceFactIds = Array.isArray(item?.source_fact_ids)
        ? Array.from(new Set(item.source_fact_ids.map(text).filter(Boolean))) as string[]
        : []
      if (!title) errors.push(`${prefix}.title_required`)
      if (!description) errors.push(`${prefix}.description_required`)
      if (!aiReasoning) errors.push(`${prefix}.ai_reasoning_required`)
      if (sourceFactIds.length === 0 || sourceFactIds.some((id) => !evidenceBackedFactIds.has(id))) {
        errors.push(`${prefix}.source_fact_not_evidence_backed_in_matter`)
      }
      if (Object.prototype.hasOwnProperty.call(item || {}, 'issue_id')) errors.push(`${prefix}.issue_id_forbidden`)
      if (Object.prototype.hasOwnProperty.call(item || {}, 'status')) errors.push(`${prefix}.status_forbidden`)
      const rawConfidence = Number(item?.confidence)
      return {
        title,
        description,
        source_fact_ids: sourceFactIds,
        confidence: Number.isFinite(rawConfidence) ? Math.max(0, Math.min(1, rawConfidence)) : null,
        ai_reasoning: aiReasoning,
      }
    })
    return errors.length > 0 ? { ok: false, errors } : { ok: true, drafts }
  }
}

export default IssueUnderstandingValidator
