import type { RuntimeStateItem } from './runtimeTypes'
import { RuntimeStateCode, RuntimeDecisionCode } from './runtimeTypes'
import type { RuntimeDecision } from './runtimeTypes'

export default function decideFromRuntimeState(runtimeState: RuntimeStateItem[]): RuntimeDecision {
  // collect matched runtime state codes (preserve original order)
  const matchedSet = new Set<string>()
  const matchedStates: RuntimeStateCode[] = []
  for (const s of runtimeState || []) {
    if (!matchedSet.has(s.code)) {
      matchedSet.add(s.code)
      matchedStates.push(s.code)
    }
  }

  const has = (code: RuntimeStateCode) => matchedSet.has(code)

  // 1) NEEDS_EVIDENCE -> COLLECT_EVIDENCE
  if (has(RuntimeStateCode.NEEDS_EVIDENCE)) {
    return { code: RuntimeDecisionCode.COLLECT_EVIDENCE, source: matchedStates }
  }

  // 2) HAS_EVIDENCE + EVIDENCE_REVIEW_DONE -> LEGAL_RESEARCH (must be before REVIEW_EVIDENCE)
  if (has(RuntimeStateCode.HAS_EVIDENCE) && matchedSet.has(RuntimeStateCode.EVIDENCE_REVIEW_DONE)) {
    return { code: RuntimeDecisionCode.LEGAL_RESEARCH, source: matchedStates }
  }

  // 3) HAS_EVIDENCE -> REVIEW_EVIDENCE
  if (has(RuntimeStateCode.HAS_EVIDENCE)) {
    return { code: RuntimeDecisionCode.REVIEW_EVIDENCE, source: matchedStates }
  }

  // 4) NO_RESEARCH -> LEGAL_RESEARCH
  if (has(RuntimeStateCode.NO_RESEARCH)) {
    return { code: RuntimeDecisionCode.LEGAL_RESEARCH, source: matchedStates }
  }

  // Remaining decisions: review documents, monitor, or no action
  if (has(RuntimeStateCode.HAS_DRAFT_DOCUMENTS)) {
    return { code: RuntimeDecisionCode.REVIEW_DOCUMENT, source: matchedStates }
  }

  if (has(RuntimeStateCode.NO_RECENT_ACTIVITY)) {
    return { code: RuntimeDecisionCode.MONITOR_MATTER, source: matchedStates }
  }

  // default
  return { code: RuntimeDecisionCode.NO_ACTION, source: matchedStates }
}
