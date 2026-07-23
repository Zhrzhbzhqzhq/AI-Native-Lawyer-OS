export const CASE_MODEL_FIELDS = [
  'identity',
  'narrative',
  'actors',
  'timeline',
  'conflicts',
  'decisionFactors',
  'risks',
  'unknowns',
  'selfReview',
] as const

export const CASE_MODEL_FORBIDDEN_FIELDS = [
  'facts',
  'issues',
  'laws',
  'documents',
] as const

export const CASE_MODEL_SCHEMA = {
  required: CASE_MODEL_FIELDS,
  additionalProperties: false,
  properties: {
    identity: ['caseId', 'title', 'caseType', 'stage', 'jurisdiction'],
    narrative: ['summary', 'background', 'currentPosture'],
    actors: ['id', 'name', 'role', 'position'],
    timeline: ['id', 'date', 'event', 'actorIds', 'certainty'],
    conflicts: ['id', 'title', 'description', 'actorIds'],
    decisionFactors: ['id', 'label', 'description', 'impact'],
    risks: ['id', 'description', 'severity', 'mitigation'],
    unknowns: ['id', 'question', 'importance'],
    selfReview: ['confidence', 'limitations', 'assumptions', 'requiresLawyerReview'],
  },
  forbidden: CASE_MODEL_FORBIDDEN_FIELDS,
} as const

export type CaseModelField = typeof CASE_MODEL_FIELDS[number]

export default CASE_MODEL_SCHEMA
