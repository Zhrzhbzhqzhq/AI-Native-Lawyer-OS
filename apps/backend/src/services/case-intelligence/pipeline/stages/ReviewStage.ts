import type { CaseSelfReview, CaseUnknown } from '../../types/caseModel.types'
import type { CasePipelineContext } from '../CasePipelineContext'
import type { CasePipelineStage } from '../CasePipelineStage'
import type { CaseIntelligenceProvider } from '../MockCaseIntelligenceProvider'

type ReviewStageOutput = { unknowns: CaseUnknown[]; selfReview: CaseSelfReview }

export class ReviewStage implements CasePipelineStage {
  readonly name = 'review'
  constructor(private readonly provider: CaseIntelligenceProvider) {}
  async run(context: CasePipelineContext) {
    const output = await this.provider.provide<ReviewStageOutput>('review', context)
    return { ...context, ...output, completedStages: [...context.completedStages, this.name] }
  }
}
