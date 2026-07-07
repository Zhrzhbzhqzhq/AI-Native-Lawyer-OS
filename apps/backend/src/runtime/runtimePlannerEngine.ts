import type { RuntimeDecision } from './runtimeTypes'
import { RuntimeDecisionCode } from './runtimeTypes'

export type PlannerPriority = 'HIGH' | 'MEDIUM' | 'LOW'

export type RuntimePlan = {
  goal: string
  priority: PlannerPriority
  source_decision: typeof RuntimeDecisionCode[keyof typeof RuntimeDecisionCode]
  steps: string[]
  generated_at: string
}

export default function planFromRuntimeDecision(decision: RuntimeDecision): RuntimePlan {
  const code = decision?.code
  const source = decision?.source || []
  const now = new Date().toISOString()

  switch (code) {
    case RuntimeDecisionCode.COLLECT_EVIDENCE:
      return {
        goal: 'Collect supporting evidence',
        priority: 'HIGH',
        source_decision: code,
        steps: [
          'Identify missing evidence types',
          'Locate related materials and attachments',
          'Create evidence entries and link materials',
        ],
        generated_at: now,
      }
    case RuntimeDecisionCode.REVIEW_EVIDENCE:
      return {
        goal: 'Review Evidence',
        priority: 'HIGH',
        source_decision: code,
        steps: [
          'Review uploaded evidence',
          'Check relevance and completeness',
          'Prepare evidence summary',
        ],
        generated_at: now,
      }
    case RuntimeDecisionCode.RESEARCH_LAW:
      return {
        goal: 'Perform legal research on missing issues',
        priority: 'MEDIUM',
        source_decision: code,
        steps: [
          'Identify key legal questions',
          'Assign research tasks to team',
          'Summarize research findings',
        ],
        generated_at: now,
      }
    case RuntimeDecisionCode.LEGAL_RESEARCH:
      return {
        goal: 'Legal Research',
        priority: 'HIGH',
        source_decision: code,
        steps: [
          'Search statutes',
          'Search precedents',
          'Generate research memo',
        ],
        generated_at: now,
      }
    case RuntimeDecisionCode.REVIEW_DOCUMENT:
      return {
        goal: 'Review and finalize draft documents',
        priority: 'MEDIUM',
        source_decision: code,
        steps: [
          'Open draft documents and check completeness',
          'Align document content with evidence',
          'Finalize drafts for review',
        ],
        generated_at: now,
      }
    case RuntimeDecisionCode.MONITOR_MATTER:
      return {
        goal: 'Monitor matter for activity',
        priority: 'LOW',
        source_decision: code,
        steps: [
          'Periodically check for new events',
          'Log status updates',
          'Notify team on activity',
        ],
        generated_at: now,
      }
    case RuntimeDecisionCode.NO_ACTION:
    default:
      return {
        goal: 'No immediate action required',
        priority: 'LOW',
        source_decision: RuntimeDecisionCode.NO_ACTION,
        steps: [],
        generated_at: now,
      }
  }
}
