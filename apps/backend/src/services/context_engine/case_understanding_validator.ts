import type { CaseUnderstandingResult } from './case_understanding_schema'

export type CaseUnderstandingValidationIssue = {
  path: string
  code: string
  message: string
}

export type CaseUnderstandingValidationResult =
  | { ok: true; value: CaseUnderstandingResult; issues: [] }
  | { ok: false; issues: CaseUnderstandingValidationIssue[] }

const UNKNOWN_VALUE = '待确认'
const UNKNOWN_ALIASES = new Set(['', 'unknown', '未知', '不详', '待定'])

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function requiredString(value: unknown, path: string, issues: CaseUnderstandingValidationIssue[]) {
  if (typeof value !== 'string' || !value.trim()) {
    issues.push({ path, code: 'required_non_empty_string', message: `${path} must be a non-empty string.` })
    return false
  }
  return true
}

function knownOrPending(value: unknown, path: string, issues: CaseUnderstandingValidationIssue[]) {
  if (!requiredString(value, path, issues)) return
  if (UNKNOWN_ALIASES.has(String(value).trim().toLowerCase())) {
    issues.push({ path, code: 'unknown_must_use_pending', message: `${path} must use “${UNKNOWN_VALUE}” when unknown.` })
  }
}

function validateItems(
  value: unknown,
  path: string,
  required: boolean,
  issues: CaseUnderstandingValidationIssue[],
  validate: (item: Record<string, unknown>, itemPath: string) => void,
) {
  if (!Array.isArray(value)) {
    issues.push({ path, code: 'array_required', message: `${path} must be an array.` })
    return
  }
  if (required && value.length === 0) {
    issues.push({ path, code: 'non_empty_array_required', message: `${path} must not be empty.` })
  }
  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`
    if (!object(item)) {
      issues.push({ path: itemPath, code: 'object_required', message: `${itemPath} must be an object.` })
      return
    }
    validate(item, itemPath)
  })
}

export class CaseUnderstandingValidator {
  validate(value: unknown): CaseUnderstandingValidationResult {
    const issues: CaseUnderstandingValidationIssue[] = []
    if (!object(value)) return { ok: false, issues: [{ path: '$', code: 'object_required', message: 'Case Understanding must be an object.' }] }

    const identity = value.identity
    if (!object(identity)) {
      issues.push({ path: 'identity', code: 'identity_required', message: 'identity must be a complete object.' })
    } else {
      requiredString(identity.title, 'identity.title', issues)
      requiredString(identity.caseType, 'identity.caseType', issues)
      knownOrPending(identity.stage, 'identity.stage', issues)
      knownOrPending(identity.jurisdiction, 'identity.jurisdiction', issues)
    }

    const narrative = value.narrative
    if (!object(narrative)) {
      issues.push({ path: 'narrative', code: 'narrative_required', message: 'narrative must be a complete object.' })
    } else {
      requiredString(narrative.summary, 'narrative.summary', issues)
      requiredString(narrative.background, 'narrative.background', issues)
      requiredString(narrative.currentPosture, 'narrative.currentPosture', issues)
    }

    const actorIds = new Set<string>()
    validateItems(value.actors, 'actors', true, issues, (actor, path) => {
      requiredString(actor.id, `${path}.id`, issues)
      requiredString(actor.name, `${path}.name`, issues)
      requiredString(actor.role, `${path}.role`, issues)
      requiredString(actor.position, `${path}.position`, issues)
      if (typeof actor.id === 'string' && actor.id.trim()) actorIds.add(actor.id)
    })

    validateItems(value.timeline, 'timeline', false, issues, (event, path) => {
      requiredString(event.id, `${path}.id`, issues)
      knownOrPending(event.date, `${path}.date`, issues)
      requiredString(event.event, `${path}.event`, issues)
      if (!Array.isArray(event.actorIds) || !event.actorIds.every((id) => typeof id === 'string' && actorIds.has(id))) {
        issues.push({ path: `${path}.actorIds`, code: 'invalid_actor_reference', message: 'timeline actorIds must reference declared actors.' })
      }
      if (!['confirmed', 'disputed', 'unknown'].includes(String(event.certainty))) {
        issues.push({ path: `${path}.certainty`, code: 'invalid_certainty', message: 'timeline certainty is invalid.' })
      }
    })

    validateItems(value.conflicts, 'conflicts', true, issues, (conflict, path) => {
      requiredString(conflict.id, `${path}.id`, issues)
      requiredString(conflict.title, `${path}.title`, issues)
      requiredString(conflict.description, `${path}.description`, issues)
      if (!Array.isArray(conflict.actorIds) || !conflict.actorIds.every((id) => typeof id === 'string' && actorIds.has(id))) {
        issues.push({ path: `${path}.actorIds`, code: 'invalid_actor_reference', message: 'conflict actorIds must reference declared actors.' })
      }
    })

    validateItems(value.unknowns, 'unknowns', false, issues, (unknown, path) => {
      requiredString(unknown.id, `${path}.id`, issues)
      requiredString(unknown.question, `${path}.question`, issues)
      if (!['low', 'medium', 'high'].includes(String(unknown.importance))) {
        issues.push({ path: `${path}.importance`, code: 'invalid_importance', message: 'unknown importance is invalid.' })
      }
    })

    return issues.length > 0
      ? { ok: false, issues }
      : { ok: true, value: value as CaseUnderstandingResult, issues: [] }
  }
}

export default CaseUnderstandingValidator
