import type { DecisionFactorEvidenceReview } from './DecisionFactorEvidenceReviewer'
import type { CaseModel } from '../types/caseModel.types'

type DecisionFactor = CaseModel['decisionFactors'][number]

export type DecisionFactorGroundingReviewInput = Omit<DecisionFactorEvidenceReview, 'sourceRefs'> & {
  sourceRefs: unknown
}

export type DecisionFactorGroundingWarning = {
  code: 'invalid_source_ref_removed'
  decisionFactorId: string
  sourceRef: string
  message: string
}

export type DecisionFactorGroundingNormalizationResult = {
  normalizedReview: DecisionFactorEvidenceReview[]
  warnings: DecisionFactorGroundingWarning[]
}

function sourceRefValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return [value]
  if (value === null || value === undefined) return []
  return [value]
}

export class DecisionFactorGroundingNormalizer {
  normalize(
    decisionFactors: readonly DecisionFactor[],
    review: readonly DecisionFactorGroundingReviewInput[],
    availableSourceRefs: readonly string[],
  ): DecisionFactorGroundingNormalizationResult {
    const factorIds = new Set(decisionFactors.map((factor) => factor.id))
    const available = new Set(availableSourceRefs)
    const warnings: DecisionFactorGroundingWarning[] = []

    const normalizedReview = review.map((entry): DecisionFactorEvidenceReview => {
      if (!factorIds.has(entry.decisionFactorId)) {
        throw new Error(`decision_factor_grounding_factor_invalid:${entry.decisionFactorId}`)
      }

      const normalized = sourceRefValues(entry.sourceRefs).flatMap((sourceRef): string[] => {
        if (typeof sourceRef !== 'string') {
          warnings.push({
            code: 'invalid_source_ref_removed',
            decisionFactorId: entry.decisionFactorId,
            sourceRef: String(sourceRef),
            message: 'Non-string source reference was removed.',
          })
          return []
        }
        const trimmed = sourceRef.trim()
        if (!trimmed || !available.has(trimmed)) {
          warnings.push({
            code: 'invalid_source_ref_removed',
            decisionFactorId: entry.decisionFactorId,
            sourceRef: trimmed || sourceRef,
            message: `Source reference ${trimmed || sourceRef} does not exist and was removed.`,
          })
          return []
        }
        return [trimmed]
      })
      const sourceRefs = Array.from(new Set(normalized))
      return {
        decisionFactorId: entry.decisionFactorId,
        supportStatus: sourceRefs.length === 0 ? 'missing_evidence' : entry.supportStatus,
        sourceRefs,
        notes: entry.notes,
      }
    })

    return { normalizedReview, warnings }
  }
}

export default DecisionFactorGroundingNormalizer
