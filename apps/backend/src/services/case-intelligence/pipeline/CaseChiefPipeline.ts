import type { CaseIntelligenceInput, CaseModel } from '../types/caseModel.types'
import { createCasePipelineContext, type CasePipelineContext } from './CasePipelineContext'
import type { CasePipelineStage } from './CasePipelineStage'
import { MockCaseIntelligenceProvider, type CaseIntelligenceProvider } from './MockCaseIntelligenceProvider'
import { ActorStage } from './stages/ActorStage'
import { ConflictStage } from './stages/ConflictStage'
import { FactorStage } from './stages/FactorStage'
import { IdentityStage } from './stages/IdentityStage'
import { MaterialStage } from './stages/MaterialStage'
import { NarrativeStage } from './stages/NarrativeStage'
import { ReviewStage } from './stages/ReviewStage'
import { RiskStage } from './stages/RiskStage'

export class CaseChiefPipeline {
  readonly stages: CasePipelineStage[]

  constructor(provider: CaseIntelligenceProvider = new MockCaseIntelligenceProvider(), stages?: CasePipelineStage[]) {
    this.stages = stages || [
      new MaterialStage(provider),
      new IdentityStage(provider),
      new NarrativeStage(provider),
      new ActorStage(provider),
      new ConflictStage(provider),
      new FactorStage(provider),
      new RiskStage(provider),
      new ReviewStage(provider),
    ]
  }

  async run(input: CaseIntelligenceInput): Promise<{ model: CaseModel; context: CasePipelineContext }> {
    let context = createCasePipelineContext(input)
    for (const stage of this.stages) context = await stage.run(context)
    return { model: this.toCaseModel(context), context }
  }

  async buildModel(input: CaseIntelligenceInput): Promise<CaseModel> {
    return (await this.run(input)).model
  }

  private toCaseModel(context: CasePipelineContext): CaseModel {
    if (!context.identity || !context.narrative || !context.actors || !context.timeline
      || !context.conflicts || !context.decisionFactors || !context.risks
      || !context.unknowns || !context.selfReview) {
      throw new Error('case_pipeline_incomplete')
    }
    return {
      identity: context.identity,
      narrative: context.narrative,
      actors: context.actors,
      timeline: context.timeline,
      conflicts: context.conflicts,
      decisionFactors: context.decisionFactors,
      risks: context.risks,
      unknowns: context.unknowns,
      selfReview: context.selfReview,
    }
  }
}

export default CaseChiefPipeline
