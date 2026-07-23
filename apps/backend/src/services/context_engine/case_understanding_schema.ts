const nonEmptyString = { type: 'string', minLength: 1, pattern: '\\S' } as const

function strictObject(properties: Record<string, unknown>, required = Object.keys(properties)) {
  return { type: 'object', additionalProperties: false, required, properties }
}

export const CASE_UNDERSTANDING_CONTRACT_VERSION = 'case-understanding-contract-v1' as const

export const CASE_UNDERSTANDING_SCHEMA_V1 = strictObject({
  identity: strictObject({
    title: nonEmptyString,
    caseType: nonEmptyString,
    stage: nonEmptyString,
    jurisdiction: nonEmptyString,
  }),
  narrative: strictObject({
    summary: nonEmptyString,
    background: nonEmptyString,
    currentPosture: nonEmptyString,
  }),
  actors: {
    type: 'array',
    minItems: 1,
    items: strictObject({ id: nonEmptyString, name: nonEmptyString, role: nonEmptyString, position: nonEmptyString }),
  },
  timeline: {
    type: 'array',
    items: strictObject({
      id: nonEmptyString,
      date: nonEmptyString,
      event: nonEmptyString,
      actorIds: { type: 'array', items: nonEmptyString },
      certainty: { type: 'string', enum: ['confirmed', 'disputed', 'unknown'] },
    }),
  },
  conflicts: {
    type: 'array',
    minItems: 1,
    items: strictObject({
      id: nonEmptyString,
      title: nonEmptyString,
      description: nonEmptyString,
      actorIds: { type: 'array', items: nonEmptyString },
    }),
  },
  unknowns: {
    type: 'array',
    items: strictObject({
      id: nonEmptyString,
      question: nonEmptyString,
      importance: { type: 'string', enum: ['low', 'medium', 'high'] },
    }),
  },
})

export type CaseUnderstandingResult = {
  identity: {
    title: string
    caseType: string
    stage: string
    jurisdiction: string
  }
  narrative: {
    summary: string
    background: string
    currentPosture: string
  }
  actors: Array<{ id: string; name: string; role: string; position: string }>
  timeline: Array<{
    id: string
    date: string
    event: string
    actorIds: string[]
    certainty: 'confirmed' | 'disputed' | 'unknown'
  }>
  conflicts: Array<{ id: string; title: string; description: string; actorIds: string[] }>
  unknowns: Array<{ id: string; question: string; importance: 'low' | 'medium' | 'high' }>
}
