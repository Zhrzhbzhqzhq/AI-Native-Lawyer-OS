export const RuntimeStateCode = {
  NEEDS_EVIDENCE: 'NEEDS_EVIDENCE',
  HAS_EVIDENCE: 'HAS_EVIDENCE',
  HAS_WEAK_EVIDENCE: 'HAS_WEAK_EVIDENCE',
  HAS_DRAFT_DOCUMENTS: 'HAS_DRAFT_DOCUMENTS',
  HAS_FINAL_DOCUMENTS: 'HAS_FINAL_DOCUMENTS',
  HAS_ARCHIVED_DOCUMENTS: 'HAS_ARCHIVED_DOCUMENTS',
  RECENT_ACTIVITY: 'RECENT_ACTIVITY',
  NO_RECENT_ACTIVITY: 'NO_RECENT_ACTIVITY',
  NO_RESEARCH: 'NO_RESEARCH',
  EVIDENCE_REVIEW_DONE: 'EVIDENCE_REVIEW_DONE',
} as const

export type RuntimeStateCode = typeof RuntimeStateCode[keyof typeof RuntimeStateCode]

export type RuntimeStateItem = {
  code: RuntimeStateCode
  value: number | boolean
}

export const RuntimeDecisionCode = {
  COLLECT_EVIDENCE: 'COLLECT_EVIDENCE',
  REVIEW_EVIDENCE: 'REVIEW_EVIDENCE',
  RESEARCH_LAW: 'RESEARCH_LAW',
  LEGAL_RESEARCH: 'LEGAL_RESEARCH',
  REVIEW_DOCUMENT: 'REVIEW_DOCUMENT',
  MONITOR_MATTER: 'MONITOR_MATTER',
  NO_ACTION: 'NO_ACTION',
} as const

export type RuntimeDecisionCode = typeof RuntimeDecisionCode[keyof typeof RuntimeDecisionCode]

export type RuntimeDecision = {
  code: RuntimeDecisionCode
  source: RuntimeStateCode[]
}
