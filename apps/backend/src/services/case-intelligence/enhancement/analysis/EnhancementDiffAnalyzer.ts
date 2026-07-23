import type { CaseModel } from '../../types/caseModel.types'

type Identified = { id: string }

export type EnhancementFieldChange = {
  field: string
  before?: unknown
  after?: unknown
}

export type EnhancementItemChange<T> = {
  id: string
  before: T
  after: T
  fields: EnhancementFieldChange[]
}

export type EnhancementCollectionDiff<T> = {
  added: T[]
  removed: T[]
  changed: Array<EnhancementItemChange<T>>
}

export type EnhancementDiffWarning = {
  code: string
  path: string
  message: string
}

export type EnhancementDiff = {
  conflicts: EnhancementCollectionDiff<CaseModel['conflicts'][number]>
  decisionFactors: EnhancementCollectionDiff<CaseModel['decisionFactors'][number]>
  risks: EnhancementCollectionDiff<CaseModel['risks'][number]>
  warnings: EnhancementDiffWarning[]
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function fieldChanges(before: Identified, after: Identified): EnhancementFieldChange[] {
  const left = before as Record<string, unknown>
  const right = after as Record<string, unknown>
  return Array.from(new Set([...Object.keys(left), ...Object.keys(right)]))
    .filter((field) => field !== 'id' && !equal(left[field], right[field]))
    .map((field) => ({
      field,
      ...(field in left ? { before: left[field] } : {}),
      ...(field in right ? { after: right[field] } : {}),
    }))
}

function collectionDiff<T extends Identified>(
  base: readonly T[],
  enhanced: readonly T[],
): EnhancementCollectionDiff<T> {
  const baseById = new Map(base.map((item) => [item.id, item]))
  const enhancedById = new Map(enhanced.map((item) => [item.id, item]))
  return {
    added: enhanced.filter((item) => !baseById.has(item.id)),
    removed: base.filter((item) => !enhancedById.has(item.id)),
    changed: enhanced.flatMap((after) => {
      const before = baseById.get(after.id)
      if (!before || equal(before, after)) return []
      return [{ id: after.id, before, after, fields: fieldChanges(before, after) }]
    }),
  }
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectStrings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectStrings)
  return []
}

function amounts(value: unknown): Set<string> {
  return new Set(collectStrings(value).flatMap((text) => (
    Array.from(text.matchAll(/\d[\d,]*(?:\.\d+)?\s*(?:元|万元|亿元)/g), (match) => (
      match[0].replace(/[\s,]/g, '')
    ))
  )))
}

function explicitReferences(value: unknown): string[] {
  return collectStrings(value).flatMap((text) => (
    text.match(/\b(?:actor|timeline|fact|material)-[A-Za-z0-9_-]+\b/g) || []
  ))
}

function deletedWarnings(diff: EnhancementDiff): EnhancementDiffWarning[] {
  return [
    ...diff.conflicts.removed.map((item) => ({
      code: 'information_removed',
      path: `conflicts.${item.id}`,
      message: `Conflict ${item.id} was removed by enhancement.`,
    })),
    ...diff.decisionFactors.removed.map((item) => ({
      code: 'information_removed',
      path: `decisionFactors.${item.id}`,
      message: `Decision factor ${item.id} was removed by enhancement.`,
    })),
    ...diff.risks.removed.map((item) => ({
      code: 'information_removed',
      path: `risks.${item.id}`,
      message: `Risk ${item.id} was removed by enhancement.`,
    })),
  ]
}

export class EnhancementDiffAnalyzer {
  analyze(baseCaseModel: CaseModel, enhancedCaseModel: CaseModel): EnhancementDiff {
    const diff: EnhancementDiff = {
      conflicts: collectionDiff(baseCaseModel.conflicts, enhancedCaseModel.conflicts),
      decisionFactors: collectionDiff(
        baseCaseModel.decisionFactors,
        enhancedCaseModel.decisionFactors,
      ),
      risks: collectionDiff(baseCaseModel.risks, enhancedCaseModel.risks),
      warnings: [],
    }
    const warnings = deletedWarnings(diff)

    const enhancementFields = new Set(['conflicts', 'decisionFactors', 'risks'])
    const base = baseCaseModel as unknown as Record<string, unknown>
    const enhanced = enhancedCaseModel as unknown as Record<string, unknown>
    for (const field of new Set([...Object.keys(base), ...Object.keys(enhanced)])) {
      if (enhancementFields.has(field) || equal(base[field], enhanced[field])) continue
      warnings.push({
        code: field in base && field in enhanced ? 'non_enhancement_field_changed' : 'case_model_field_changed',
        path: field,
        message: `${field} changed outside the enhancement analysis scope.`,
      })
    }

    const baseReferences = new Set([
      ...baseCaseModel.actors.map((actor) => actor.id),
      ...baseCaseModel.timeline.map((entry) => entry.id),
      ...explicitReferences(baseCaseModel),
    ])
    const changedContent = {
      conflicts: [...diff.conflicts.added, ...diff.conflicts.changed.map((item) => item.after)],
      decisionFactors: [
        ...diff.decisionFactors.added,
        ...diff.decisionFactors.changed.map((item) => item.after),
      ],
      risks: [...diff.risks.added, ...diff.risks.changed.map((item) => item.after)],
    }
    for (const [section, content] of Object.entries(changedContent)) {
      for (const reference of new Set(explicitReferences(content))) {
        if (baseReferences.has(reference)) continue
        warnings.push({
          code: 'unknown_reference',
          path: section,
          message: `${reference} does not exist in the base CaseModel.`,
        })
      }
    }

    const baseAmounts = amounts(baseCaseModel)
    for (const [section, content] of Object.entries(changedContent)) {
      for (const amount of amounts(content)) {
        if (baseAmounts.has(amount)) continue
        warnings.push({
          code: 'possible_information_drift',
          path: section,
          message: `${amount} appears only in enhanced content.`,
        })
      }
    }

    return { ...diff, warnings }
  }
}

export default EnhancementDiffAnalyzer
