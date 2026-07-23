import CaseModelValidator from '../CaseModelValidator'
import type {
  CaseIntelligenceInput,
  CaseModel,
} from '../types/caseModel.types'
import EnhancementDiffAnalyzer, {
  type EnhancementDiff,
  type EnhancementDiffWarning,
} from './analysis/EnhancementDiffAnalyzer'
import ConflictEnhancer from './ConflictEnhancer'
import DecisionFactorEnhancer from './DecisionFactorEnhancer'

type ConflictEnhancement = Pick<ConflictEnhancer, 'enhance'>
type DecisionFactorEnhancement = Pick<DecisionFactorEnhancer, 'enhance'>
type DiffAnalysis = Pick<EnhancementDiffAnalyzer, 'analyze'>

export type EnhancementOrchestratorResult = {
  enhancedCaseModel: CaseModel
  afterConflictEnhancement: CaseModel
  diff: EnhancementDiff
  warnings: EnhancementDiffWarning[]
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function assertOnlyChanged(
  before: CaseModel,
  after: CaseModel,
  allowedFields: readonly (keyof CaseModel)[],
): void {
  const allowed = new Set<keyof CaseModel>(allowedFields)
  for (const field of Object.keys(before) as Array<keyof CaseModel>) {
    if (allowed.has(field) || equal(before[field], after[field])) continue
    const error = new Error(`enhancement_unauthorized_field_change:${field}`)
    ;(error as any).code = 'enhancement_unauthorized_field_change'
    ;(error as any).field = field
    throw error
  }
}

export class EnhancementOrchestrator {
  private afterConflictEnhancement: CaseModel | undefined
  private afterDecisionFactorEnhancement: CaseModel | undefined

  constructor(
    private readonly conflictEnhancer: ConflictEnhancement = new ConflictEnhancer(),
    private readonly decisionFactorEnhancer: DecisionFactorEnhancement = new DecisionFactorEnhancer(),
    private readonly diffAnalyzer: DiffAnalysis = new EnhancementDiffAnalyzer(),
    private readonly validator = new CaseModelValidator(),
  ) {}

  async enhance(
    input: CaseIntelligenceInput,
    baseCaseModel: CaseModel,
  ): Promise<EnhancementOrchestratorResult> {
    this.afterConflictEnhancement = undefined
    this.afterDecisionFactorEnhancement = undefined
    const conflictEnhancedModel = await this.conflictEnhancer.enhance(input, baseCaseModel)
    this.afterConflictEnhancement = structuredClone(conflictEnhancedModel)
    assertOnlyChanged(baseCaseModel, conflictEnhancedModel, ['conflicts'])

    const enhancedCaseModel = await this.decisionFactorEnhancer.enhance(
      input,
      conflictEnhancedModel,
    )
    this.afterDecisionFactorEnhancement = structuredClone(enhancedCaseModel)
    assertOnlyChanged(conflictEnhancedModel, enhancedCaseModel, ['decisionFactors'])
    assertOnlyChanged(baseCaseModel, enhancedCaseModel, ['conflicts', 'decisionFactors'])

    const validation = this.validator.validate(enhancedCaseModel, {
      sourceText: JSON.stringify(input.context),
    })
    if (!validation.ok) {
      const error = new Error('enhancement_orchestrator_case_model_invalid')
      ;(error as any).code = 'enhancement_orchestrator_case_model_invalid'
      ;(error as any).failingStage = 'enhancement_orchestrator_validation'
      ;(error as any).schemaValidationError = validation
      throw error
    }

    const diff = this.diffAnalyzer.analyze(baseCaseModel, enhancedCaseModel)
    return {
      enhancedCaseModel,
      afterConflictEnhancement: structuredClone(conflictEnhancedModel),
      diff,
      warnings: diff.warnings,
    }
  }

  artifacts(): {
    afterConflictEnhancement?: CaseModel
    afterDecisionFactorEnhancement?: CaseModel
  } {
    return {
      ...(this.afterConflictEnhancement
        ? { afterConflictEnhancement: structuredClone(this.afterConflictEnhancement) }
        : {}),
      ...(this.afterDecisionFactorEnhancement
        ? { afterDecisionFactorEnhancement: structuredClone(this.afterDecisionFactorEnhancement) }
        : {}),
    }
  }
}

export default EnhancementOrchestrator
