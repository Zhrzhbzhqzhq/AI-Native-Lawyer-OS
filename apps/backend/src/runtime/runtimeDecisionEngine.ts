import type { RuntimeStateItem } from './runtimeTypes'
import { RuntimeStateCode, RuntimeDecisionCode } from './runtimeTypes'
import type { RuntimeDecision } from './runtimeTypes'

export default function decideFromRuntimeState(runtimeState: RuntimeStateItem[]): RuntimeDecision {
  // Step 1: collect all matched runtime state codes (preserve original order of appearance if any)
  const matchedSet = new Set<string>()
  const matchedStates: RuntimeStateCode[] = []
  for (const s of runtimeState || []) {
    if (!matchedSet.has(s.code)) {
      matchedSet.add(s.code)
      matchedStates.push(s.code)
    }
  }

  // Step 2: fixed priority table mapping decisions to triggering runtime states
  const decisionTriggers: Record<string, RuntimeStateCode[]> = {
    [RuntimeDecisionCode.COLLECT_EVIDENCE]: [RuntimeStateCode.NEEDS_EVIDENCE],
    [RuntimeDecisionCode.REVIEW_EVIDENCE]: [RuntimeStateCode.HAS_WEAK_EVIDENCE],
    [RuntimeDecisionCode.RESEARCH_LAW]: [RuntimeStateCode.NO_RESEARCH],
    [RuntimeDecisionCode.REVIEW_DOCUMENT]: [RuntimeStateCode.HAS_DRAFT_DOCUMENTS],
    [RuntimeDecisionCode.MONITOR_MATTER]: [RuntimeStateCode.NO_RECENT_ACTIVITY],
    [RuntimeDecisionCode.NO_ACTION]: [],
  }

  const decisionPriority: RuntimeDecisionCode[] = [
    RuntimeDecisionCode.COLLECT_EVIDENCE,
    RuntimeDecisionCode.REVIEW_EVIDENCE,
    RuntimeDecisionCode.RESEARCH_LAW,
    RuntimeDecisionCode.REVIEW_DOCUMENT,
    RuntimeDecisionCode.MONITOR_MATTER,
    RuntimeDecisionCode.NO_ACTION,
  ]

  // Select the highest-priority decision whose triggers intersect with matchedStates
  for (const decision of decisionPriority) {
    const triggers = decisionTriggers[decision] || []
    if (triggers.length === 0 && matchedStates.length === 0) {
      // no matched states -> NO_ACTION
      return { code: RuntimeDecisionCode.NO_ACTION, source: [] }
    }
    for (const t of triggers) {
      if (matchedSet.has(t)) {
        // return decision with full source being all matched states
        return { code: decision as RuntimeDecisionCode, source: matchedStates }
      }
    }
  }

  // Fallback: NO_ACTION with all matched states (shouldn't reach due to priority including NO_ACTION)
  return { code: RuntimeDecisionCode.NO_ACTION, source: matchedStates }
}
