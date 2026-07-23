export type CaseIdentity = {
  caseId: string
  title: string
  caseType: string
  stage: string
  jurisdiction: string
}

export type CaseNarrative = {
  summary: string
  background: string
  currentPosture: string
}

export type CaseActor = {
  id: string
  name: string
  role: string
  position: string
}

export type CaseTimelineEntry = {
  id: string
  date: string
  event: string
  actorIds: string[]
  certainty: 'confirmed' | 'disputed' | 'unknown'
}

export type CaseConflict = {
  id: string
  title: string
  description: string
  actorIds: string[]
}

export type CaseDecisionFactor = {
  id: string
  label: string
  description: string
  impact: 'supportive' | 'adverse' | 'neutral' | 'uncertain'
}

export type CaseRisk = {
  id: string
  description: string
  severity: 'low' | 'medium' | 'high'
  mitigation: string
}

export type CaseUnknown = {
  id: string
  question: string
  importance: 'low' | 'medium' | 'high'
}

export type CaseSelfReview = {
  confidence: number
  limitations: string[]
  assumptions: string[]
  requiresLawyerReview: boolean
}

export type CaseModel = {
  identity: CaseIdentity
  narrative: CaseNarrative
  actors: CaseActor[]
  timeline: CaseTimelineEntry[]
  conflicts: CaseConflict[]
  decisionFactors: CaseDecisionFactor[]
  risks: CaseRisk[]
  unknowns: CaseUnknown[]
  selfReview: CaseSelfReview
}

export type CaseModelValidationIssue = {
  path: string
  code: string
  message: string
}

export type CaseModelValidationResult = {
  ok: boolean
  issues: CaseModelValidationIssue[]
}

export type CaseEvaluation = {
  caseId: string
  status: 'ready' | 'incomplete'
  completeness: number
  dimensions: {
    identity: number
    narrative: number
    actors: number
    timeline: number
    conflicts: number
    decisionFactors: number
    selfReview: number
  }
  notes: string[]
}

export type CaseEvaluationDimension = {
  score: number
  weight: number
  details: string
  components?: Record<string, number>
}

export type CaseComparisonEvaluation = {
  caseId: string
  status: 'completed'
  score: number
  dimensions: {
    identity: CaseEvaluationDimension
    narrative: CaseEvaluationDimension
    actors: CaseEvaluationDimension
    conflicts: CaseEvaluationDimension
    decisionFactors: CaseEvaluationDimension
    risks: CaseEvaluationDimension
    unknowns: CaseEvaluationDimension
    topicDrift: CaseEvaluationDimension
  }
  topicDriftDetected: boolean
  errors: string[]
}

export type CaseIntelligenceInput = {
  case_id: string
  title: string
  context: unknown
}

export type CaseIntelligenceResult = {
  model: CaseModel
  validation: CaseModelValidationResult
  evaluation: CaseEvaluation
}
