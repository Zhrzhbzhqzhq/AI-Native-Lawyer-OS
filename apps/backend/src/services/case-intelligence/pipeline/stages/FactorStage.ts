import type { CaseDecisionFactor } from '../../types/caseModel.types'
import type { CasePipelineContext } from '../CasePipelineContext'
import type { CasePipelineStage } from '../CasePipelineStage'
import type { CaseIntelligenceProvider } from '../MockCaseIntelligenceProvider'

export class FactorStage implements CasePipelineStage {
  readonly name = 'factor'
  constructor(private readonly provider: CaseIntelligenceProvider) {}
  async run(context: CasePipelineContext) {
    const decisionFactors = await this.provider.provide<CaseDecisionFactor[]>('factor', context)
    return { ...context, decisionFactors, completedStages: [...context.completedStages, this.name] }
  }
}
