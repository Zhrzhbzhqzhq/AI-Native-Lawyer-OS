export type FactUnderstandingDraft = {
  title: string
  description: string
  category: 'confirmed' | 'to_prove' | 'disputed'
  source_evidence_ids: string[]
  confidence: number | null
  ai_reasoning: string
}

export type FactUnderstandingValidationResult =
  | { ok: true; drafts: FactUnderstandingDraft[] }
  | { ok: false; errors: string[] }

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export class FactUnderstandingValidator {
  validate(value: unknown, evidences: Array<{ evidenceId: string }>): FactUnderstandingValidationResult {
    const source = value && typeof value === 'object' && !Array.isArray(value)
      ? (value as any).fact_drafts
      : value
    if (!Array.isArray(source) || source.length === 0) return { ok: false, errors: ['fact_drafts_required'] }

    const validEvidenceIds = new Set(evidences.map((evidence) => evidence.evidenceId))
    const errors: string[] = []
    const drafts = source.map((item: any, index) => {
      const prefix = `fact_drafts[${index}]`
      const title = text(item?.title)
      const description = text(item?.description)
      const category = text(item?.category)
      const sourceEvidenceIds = Array.isArray(item?.source_evidence_ids)
        ? Array.from(new Set(item.source_evidence_ids.map(text).filter(Boolean))) as string[]
        : []
      if (!title) errors.push(`${prefix}.title_required`)
      if (!description) errors.push(`${prefix}.description_required`)
      if (!['confirmed', 'to_prove', 'disputed'].includes(category)) errors.push(`${prefix}.category_invalid`)
      if (sourceEvidenceIds.length === 0 || sourceEvidenceIds.some((id) => !validEvidenceIds.has(id))) {
        errors.push(`${prefix}.source_evidence_not_in_matter`)
      }
      if (Object.prototype.hasOwnProperty.call(item || {}, 'fact_id')) errors.push(`${prefix}.fact_id_forbidden`)
      if (Object.prototype.hasOwnProperty.call(item || {}, 'status')) errors.push(`${prefix}.status_forbidden`)
      const rawConfidence = Number(item?.confidence)
      return {
        title,
        description,
        category: category as FactUnderstandingDraft['category'],
        source_evidence_ids: sourceEvidenceIds,
        confidence: Number.isFinite(rawConfidence) ? Math.max(0, Math.min(1, rawConfidence)) : null,
        ai_reasoning: text(item?.ai_reasoning),
      }
    })
    return errors.length > 0 ? { ok: false, errors } : { ok: true, drafts }
  }
}

export default FactUnderstandingValidator
