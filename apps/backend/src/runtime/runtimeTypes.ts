export const RuntimeStateCode = {
  NEEDS_EVIDENCE: 'NEEDS_EVIDENCE',
  HAS_WEAK_EVIDENCE: 'HAS_WEAK_EVIDENCE',
  HAS_DRAFT_DOCUMENTS: 'HAS_DRAFT_DOCUMENTS',
  HAS_FINAL_DOCUMENTS: 'HAS_FINAL_DOCUMENTS',
  HAS_ARCHIVED_DOCUMENTS: 'HAS_ARCHIVED_DOCUMENTS',
  RECENT_ACTIVITY: 'RECENT_ACTIVITY',
  NO_RECENT_ACTIVITY: 'NO_RECENT_ACTIVITY',
  NO_RESEARCH: 'NO_RESEARCH',
} as const

export type RuntimeStateCode = typeof RuntimeStateCode[keyof typeof RuntimeStateCode]

export type RuntimeStateItem = {
  code: RuntimeStateCode
  value: number | boolean
}
