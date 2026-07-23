import type {
  CaseActor,
  CaseConflict,
  CaseDecisionFactor,
  CaseIdentity,
  CaseIntelligenceInput,
  CaseNarrative,
  CaseRisk,
  CaseSelfReview,
  CaseTimelineEntry,
  CaseUnknown,
} from '../types/caseModel.types'

export type CasePipelineMaterial = {
  id: string
  title: string
  content: string
}

export type CasePipelineContext = {
  input: CaseIntelligenceInput
  materials: CasePipelineMaterial[]
  identity?: CaseIdentity
  narrative?: CaseNarrative
  actors?: CaseActor[]
  timeline?: CaseTimelineEntry[]
  conflicts?: CaseConflict[]
  decisionFactors?: CaseDecisionFactor[]
  risks?: CaseRisk[]
  unknowns?: CaseUnknown[]
  selfReview?: CaseSelfReview
  completedStages: string[]
}

export function createCasePipelineContext(input: CaseIntelligenceInput): CasePipelineContext {
  return { input, materials: [], completedStages: [] }
}
