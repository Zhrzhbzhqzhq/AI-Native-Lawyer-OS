import type { CaseNarrative } from '../../types/caseModel.types'
import type { CasePipelineContext } from '../CasePipelineContext'
import type { CasePipelineStage } from '../CasePipelineStage'
import type { CaseIntelligenceProvider } from '../MockCaseIntelligenceProvider'

export class NarrativeStage implements CasePipelineStage {
  readonly name = 'narrative'
  constructor(private readonly provider: CaseIntelligenceProvider) {}
  async run(context: CasePipelineContext) {
    const narrative = await this.provider.provide<CaseNarrative>('narrative', context)
    return { ...context, narrative, completedStages: [...context.completedStages, this.name] }
  }
}
