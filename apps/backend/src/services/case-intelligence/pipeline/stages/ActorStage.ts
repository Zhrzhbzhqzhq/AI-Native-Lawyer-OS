import type { CaseActor, CaseTimelineEntry } from '../../types/caseModel.types'
import type { CasePipelineContext } from '../CasePipelineContext'
import type { CasePipelineStage } from '../CasePipelineStage'
import type { CaseIntelligenceProvider } from '../MockCaseIntelligenceProvider'

type ActorStageOutput = { actors: CaseActor[]; timeline: CaseTimelineEntry[] }

export class ActorStage implements CasePipelineStage {
  readonly name = 'actor'
  constructor(private readonly provider: CaseIntelligenceProvider) {}
  async run(context: CasePipelineContext) {
    const output = await this.provider.provide<ActorStageOutput>('actor', context)
    return { ...context, ...output, completedStages: [...context.completedStages, this.name] }
  }
}
