const nonEmptyString = { type: 'string', minLength: 1, pattern: '\\S' } as const

function strictObject(properties: Record<string, unknown>, required = Object.keys(properties)) {
  return { type: 'object', additionalProperties: false, required, properties }
}

export const EVIDENCE_DRAFT_CONTRACT_VERSION = 'evidence-draft-contract-v2' as const

export const EVIDENCE_DRAFT_SCHEMA_V2 = strictObject({
  evidence_drafts: {
    type: 'array',
    minItems: 1,
    items: strictObject({
      draft_id: nonEmptyString,
      material_id: nonEmptyString,
      title: nonEmptyString,
      evidence_type: nonEmptyString,
      proof_purpose: nonEmptyString,
      proof_relationship: nonEmptyString,
      importance: { type: 'string', enum: ['critical', 'important', 'supporting'] },
      legal_use: nonEmptyString,
      source_material_ids: { type: 'array', minItems: 1, items: nonEmptyString },
      materials: {
        type: 'array',
        minItems: 1,
        items: strictObject({ material_id: nonEmptyString, title: nonEmptyString }),
      },
      summary: nonEmptyString,
      reasoning: nonEmptyString,
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      source: { type: 'string', enum: ['client', 'opponent', 'court', 'third_party'] },
      suggested_action: { type: 'string', const: 'confirm_as_evidence' },
    }),
  },
})

export type EvidenceUnderstandingDraft = {
  draft_id: string
  material_id: string
  title: string
  evidence_type: string
  proof_purpose: string
  proof_relationship: string
  importance: 'critical' | 'important' | 'supporting'
  legal_use: string
  source_material_ids: string[]
  materials: Array<{ material_id: string; title: string }>
  summary: string
  reasoning: string
  confidence: number
  source: 'client' | 'opponent' | 'court' | 'third_party'
  suggested_action: 'confirm_as_evidence'
}
