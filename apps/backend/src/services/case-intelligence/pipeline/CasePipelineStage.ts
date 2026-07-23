import type { CasePipelineContext } from './CasePipelineContext'

export interface CasePipelineStage {
  readonly name: string
  run(context: CasePipelineContext): Promise<CasePipelineContext>
}
