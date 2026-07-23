import type { CaseRisk } from '../../types/caseModel.types'
import type { CasePipelineContext } from '../CasePipelineContext'
import type { CasePipelineStage } from '../CasePipelineStage'
import type { CaseIntelligenceProvider } from '../MockCaseIntelligenceProvider'

export class RiskStage implements CasePipelineStage {
  readonly name = 'risk'
  constructor(private readonly provider: CaseIntelligenceProvider) {}
  async run(context: CasePipelineContext) {
    const risks = await this.provider.provide<CaseRisk[]>('risk', context)
    return { ...context, risks, completedStages: [...context.completedStages, this.name] }
  }
}
