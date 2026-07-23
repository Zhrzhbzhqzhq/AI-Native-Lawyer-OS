import type { InitialUnderstanding } from './InitialReader'

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function normalizeStringArray(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  return []
}

export class InitialUnderstandingNormalizer {
  normalize(value: unknown): InitialUnderstanding {
    const understanding = isObject(value) ? value : {}

    return {
      caseNature: normalizeString(understanding.caseNature, 'unknown'),
      summary: normalizeString(understanding.summary, ''),
      importantFacts: normalizeStringArray(understanding.importantFacts),
      possibleConflicts: normalizeStringArray(understanding.possibleConflicts),
      uncertainties: normalizeStringArray(understanding.uncertainties),
    }
  }
}

export default InitialUnderstandingNormalizer
