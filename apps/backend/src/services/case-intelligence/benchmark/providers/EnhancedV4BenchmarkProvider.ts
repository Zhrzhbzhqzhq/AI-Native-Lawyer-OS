import type { DecisionFactorEvidenceReview } from '../../enhancement/DecisionFactorEvidenceReviewer'
import type { DecisionFactorGroundingWarning } from '../../enhancement/DecisionFactorGroundingNormalizer'
import type {
  CaseIntelligenceInput,
  CaseModel,
} from '../../types/caseModel.types'
import type { BenchmarkProviderArtifacts } from '../types/benchmark.types'

type CaseModelGenerator = { generateCaseModel(input: CaseIntelligenceInput): Promise<CaseModel> }
type CaseModelEnhancer = { enhance(input: CaseIntelligenceInput, model: CaseModel): Promise<CaseModel> }
type EvidenceReviewer = {
  review(
    input: CaseIntelligenceInput,
    baseCaseModel: CaseModel,
    enhancedV2CaseModel: CaseModel,
  ): Promise<DecisionFactorEvidenceReview[]>
  groundingWarnings?(): readonly DecisionFactorGroundingWarning[]
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export class EnhancedV4BenchmarkProvider {
  private decisionFactorReview: DecisionFactorEvidenceReview[] | undefined
  private afterConflictEnhancement: CaseModel | undefined
  private afterDecisionFactorEnhancement: CaseModel | undefined
  private afterReview: CaseModel | undefined

  constructor(
    private readonly directProvider: CaseModelGenerator,
    private readonly conflictEnhancer: CaseModelEnhancer,
    private readonly decisionFactorEnhancer: CaseModelEnhancer,
    private readonly evidenceReviewer: EvidenceReviewer,
  ) {}

  async generateCaseModel(
    input: CaseIntelligenceInput,
    providedBaseCaseModel?: CaseModel,
  ): Promise<CaseModel> {
    this.decisionFactorReview = undefined
    this.afterConflictEnhancement = undefined
    this.afterDecisionFactorEnhancement = undefined
    this.afterReview = undefined
    const baseCaseModel = providedBaseCaseModel
      ? structuredClone(providedBaseCaseModel)
      : await this.directProvider.generateCaseModel(input)
    const conflictEnhancedModel = await this.conflictEnhancer.enhance(input, baseCaseModel)
    this.afterConflictEnhancement = structuredClone(conflictEnhancedModel)
    const enhancedV2CaseModel = await this.decisionFactorEnhancer.enhance(
      input,
      conflictEnhancedModel,
    )
    this.afterDecisionFactorEnhancement = structuredClone(enhancedV2CaseModel)
    const beforeReview = structuredClone(enhancedV2CaseModel)
    const review = await this.evidenceReviewer.review(input, baseCaseModel, enhancedV2CaseModel)
    if (!equal(beforeReview, enhancedV2CaseModel)) {
      throw new Error('decision_factor_evidence_review_modified_case_model')
    }
    this.decisionFactorReview = review
    this.afterReview = structuredClone(enhancedV2CaseModel)
    return enhancedV2CaseModel
  }

  artifacts(): BenchmarkProviderArtifacts {
    return this.decisionFactorReview
      ? {
          decisionFactorReview: this.decisionFactorReview,
          decisionFactorGroundingWarnings: this.evidenceReviewer.groundingWarnings?.() || [],
          ...(this.afterConflictEnhancement
            ? { afterConflictEnhancement: structuredClone(this.afterConflictEnhancement) }
            : {}),
          ...(this.afterDecisionFactorEnhancement
            ? { afterDecisionFactorEnhancement: structuredClone(this.afterDecisionFactorEnhancement) }
            : {}),
          ...(this.afterReview ? { afterReview: structuredClone(this.afterReview) } : {}),
        }
      : {
          ...(this.afterConflictEnhancement
            ? { afterConflictEnhancement: structuredClone(this.afterConflictEnhancement) }
            : {}),
          ...(this.afterDecisionFactorEnhancement
            ? { afterDecisionFactorEnhancement: structuredClone(this.afterDecisionFactorEnhancement) }
            : {}),
        }
  }
}

export default EnhancedV4BenchmarkProvider
