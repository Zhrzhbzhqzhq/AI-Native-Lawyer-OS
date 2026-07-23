import type { CaseModel } from '../types/caseModel.types'

type Conflict = CaseModel['conflicts'][number]

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function conflictObject(value: unknown, actorIds: ReadonlySet<string>): value is Conflict {
  if (!isObject(value)
    || !nonEmptyString(value.id)
    || !nonEmptyString(value.title)
    || !nonEmptyString(value.description)
    || !Array.isArray(value.actorIds)
    || !value.actorIds.every(nonEmptyString)) return false
  return value.actorIds.every((actorId) => actorIds.has(actorId))
}

function conflictItems(value: unknown): unknown[] {
  if (value === null || value === undefined) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return [value]
  if (isObject(value)) {
    if (!('conflicts' in value) || value.conflicts === null || value.conflicts === undefined) return []
    if (Array.isArray(value.conflicts)) return value.conflicts
    if (typeof value.conflicts === 'string') return [value.conflicts]
  }
  throw new Error('conflict_enhancement_output_invalid')
}

export class ConflictEnhancementNormalizer {
  normalize(value: unknown, model: CaseModel): Conflict[] {
    const actorIds = new Set(model.actors.map((actor) => actor.id))
    return conflictItems(value).flatMap((item, index): Conflict[] => {
      if (conflictObject(item, actorIds)) return [item]
      if (nonEmptyString(item)) {
        const text = item.trim()
        return [{
          id: `conflict-enhanced-${index + 1}`,
          title: text,
          description: text,
          actorIds: Array.from(actorIds),
        }]
      }
      return []
    })
  }
}

export default ConflictEnhancementNormalizer
