import type { CaseConflict } from '../../types/caseModel.types'
import type { CasePipelineContext } from '../CasePipelineContext'
import type { CasePipelineStage } from '../CasePipelineStage'
import type { CaseIntelligenceProvider } from '../MockCaseIntelligenceProvider'

export class ConflictStage implements CasePipelineStage {
  readonly name = 'conflict'
  constructor(private readonly provider: CaseIntelligenceProvider) {}
  async run(context: CasePipelineContext) {
    const conflicts = await this.provider.provide<CaseConflict[]>('conflict', context)
    return { ...context, conflicts, completedStages: [...context.completedStages, this.name] }
  }
}
