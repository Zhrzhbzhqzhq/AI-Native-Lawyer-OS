import AmountDerivationValidator from '../AmountDerivationValidator'
import type {
  CaseModel,
  CaseModelValidationIssue,
  CaseModelValidationResult,
} from '../types/caseModel.types'

const AMOUNT_PATTERN = /\d[\d,]*(?:\.\d+)?\s*(?:元|万元|亿元)/g
const ISO_DATE_PATTERN = /\b\d{4}-\d{1,2}-\d{1,2}\b/g
const CHINESE_DATE_PATTERN = /\d{4}年\d{1,2}月\d{1,2}日/g
const ACTOR_ID_PATTERN = /\bactor-[A-Za-z0-9_-]+\b/g

function objectValue(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectStrings)
  if (objectValue(value)) return Object.values(value).flatMap(collectStrings)
  return []
}

function matches(texts: readonly string[], pattern: RegExp): string[] {
  return texts.flatMap((text) => Array.from(text.matchAll(pattern), (match) => match[0]))
}

function normalizedDate(date: string): string {
  const numbers = date.match(/\d+/g)
  if (!numbers || numbers.length !== 3) return date
  return `${numbers[0]}-${numbers[1].padStart(2, '0')}-${numbers[2].padStart(2, '0')}`
}

function unique<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values))
}

export class EnhancementFactValidator {
  constructor(
    private readonly amountDerivationValidator = new AmountDerivationValidator(),
  ) {}

  validate(baseCaseModel: CaseModel, enhancedCaseModel: CaseModel): CaseModelValidationResult {
    const issues: CaseModelValidationIssue[] = []
    const baseStrings = collectStrings(baseCaseModel)
    const baseStringSet = new Set(baseStrings)
    const newStrings = collectStrings(enhancedCaseModel)
      .filter((text) => !baseStringSet.has(text))
    this.validateAmounts(baseCaseModel, newStrings, issues)
    this.validateDates(baseStrings, newStrings, issues)
    this.validateActors(baseCaseModel, enhancedCaseModel, newStrings, issues)
    return { ok: issues.length === 0, issues }
  }

  private validateAmounts(
    baseCaseModel: CaseModel,
    newStrings: readonly string[],
    issues: CaseModelValidationIssue[],
  ): void {
    const baseText = JSON.stringify(baseCaseModel)
    const explicitAmounts = new Set(matches(collectStrings(baseCaseModel), AMOUNT_PATTERN)
      .map((amount) => amount.replace(/\s|,/g, '')))
    const newAmounts = unique(matches(newStrings, AMOUNT_PATTERN)
      .map((amount) => amount.replace(/\s|,/g, '')))

    for (const amount of newAmounts) {
      if (explicitAmounts.has(amount)) continue
      const derivation = this.amountDerivationValidator.validate(amount, newStrings, baseText)
      if (derivation.status === 'valid') continue
      if (derivation.status === 'mismatch') {
        issues.push({
          path: '$',
          code: 'enhancement_amount_derivation_mismatch',
          message: `Enhanced amount ${amount} does not match derived amount ${derivation.expectedYuan}元.`,
        })
      } else {
        issues.push({
          path: '$',
          code: 'enhancement_amount_unsupported',
          message: `Enhanced amount ${amount} is not explicit or derivable from Base CaseModel.`,
        })
      }
    }
  }

  private validateDates(
    baseStrings: readonly string[],
    newStrings: readonly string[],
    issues: CaseModelValidationIssue[],
  ): void {
    const baseDates = new Set([
      ...matches(baseStrings, ISO_DATE_PATTERN),
      ...matches(baseStrings, CHINESE_DATE_PATTERN),
    ].map(normalizedDate))
    const newDates = unique([
      ...matches(newStrings, ISO_DATE_PATTERN),
      ...matches(newStrings, CHINESE_DATE_PATTERN),
    ].map(normalizedDate))
    for (const date of newDates) {
      if (!baseDates.has(date)) {
        issues.push({
          path: '$',
          code: 'enhancement_date_unsupported',
          message: `Enhanced date ${date} does not exist in Base CaseModel timeline or facts.`,
        })
      }
    }
  }

  private validateActors(
    baseCaseModel: CaseModel,
    enhancedCaseModel: CaseModel,
    newStrings: readonly string[],
    issues: CaseModelValidationIssue[],
  ): void {
    const actorIds = new Set(baseCaseModel.actors.map((actor) => actor.id))
    const addedActors = enhancedCaseModel.actors.filter((actor) => !actorIds.has(actor.id))
    const newActorRefs = unique(matches(newStrings, ACTOR_ID_PATTERN))
      .filter((actorId) => !actorIds.has(actorId))
    for (const actorId of unique([
      ...addedActors.map((actor) => actor.id),
      ...newActorRefs,
    ])) {
      issues.push({
        path: 'actors',
        code: 'enhancement_actor_unsupported',
        message: `Enhanced actor ${actorId} does not exist in Base CaseModel actors.`,
      })
    }
  }
}

export default EnhancementFactValidator
