import type { CaseIdentity } from '../../types/caseModel.types'
import type { CasePipelineContext } from '../CasePipelineContext'
import type { CasePipelineStage } from '../CasePipelineStage'
import type { CaseIntelligenceProvider } from '../MockCaseIntelligenceProvider'

export class IdentityStage implements CasePipelineStage {
  readonly name = 'identity'
  constructor(private readonly provider: CaseIntelligenceProvider) {}
  async run(context: CasePipelineContext) {
    const identity = await this.provider.provide<CaseIdentity>('identity', context)
    return { ...context, identity, completedStages: [...context.completedStages, this.name] }
  }
}
