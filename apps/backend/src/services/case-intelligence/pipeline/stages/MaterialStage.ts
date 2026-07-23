import type { CaseIntelligenceProvider } from '../MockCaseIntelligenceProvider'
import type { CasePipelineContext, CasePipelineMaterial } from '../CasePipelineContext'
import type { CasePipelineStage } from '../CasePipelineStage'

export class MaterialStage implements CasePipelineStage {
  readonly name = 'material'
  constructor(private readonly provider: CaseIntelligenceProvider) {}
  async run(context: CasePipelineContext) {
    const materials = await this.provider.provide<CasePipelineMaterial[]>('material', context)
    return { ...context, materials, completedStages: [...context.completedStages, this.name] }
  }
}
