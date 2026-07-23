import type { CaseModel } from '../case-intelligence/types/caseModel.types'
import type { CaseUnderstandingResult } from './case_understanding_generator'

export type ComparableCaseUnderstanding = {
  caseIdentity: CaseModel['identity']
  narrative: CaseUnderstandingResult['narrative']
  actors: CaseUnderstandingResult['actors']
  timeline: CaseUnderstandingResult['timeline']
  conflicts: CaseUnderstandingResult['conflicts']
  unknowns: CaseUnderstandingResult['unknowns']
}

type StoredCaseUnderstanding = ComparableCaseUnderstanding | CaseUnderstandingResult

export type ContextEngineComparisonReport = {
  baselineScore: number
  contextEngineScore: number
  delta: number
  recovered: boolean
  baseline: EvaluationDimensions
  contextEngine: EvaluationDimensions
}

type CoverageItem = {
  expected: string
  actual: string
  score: number
}

export type EvaluationDimensions = {
  overall: number
  caseIdentity: {
    score: number
    caseType: CoverageItem
    subjects: { expected: string[]; actual: string[]; coverage: number }
    legalRelationship: CoverageItem
  }
  narrative: { score: number; mainLine: CoverageItem }
  actors: { score: number; expected: string[]; actual: string[]; missing: string[] }
  timeline: { score: number; coverage: CoverageItem[] }
  conflicts: { score: number; coverage: CoverageItem[] }
  unknowns: { score: number; coverage: CoverageItem[] }
  hallucination: {
    score: number
    unsupportedAmounts: string[]
    unsupportedDates: string[]
    note: string
  }
}

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

function normalized(value: unknown) {
  return String(value || '').toLowerCase().replace(/[\s，。！？；：、,.!?;:'"“”‘’（）()《》【】\[\]{}\-_/]/g, '')
}

function bigrams(value: unknown) {
  const text = normalized(value)
  if (!text) return new Set<string>()
  if (text.length === 1) return new Set([text])
  return new Set(Array.from({ length: text.length - 1 }, (_, index) => text.slice(index, index + 2)))
}

function similarity(left: unknown, right: unknown) {
  const a = bigrams(left)
  const b = bigrams(right)
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const item of a) if (b.has(item)) intersection += 1
  return intersection / (a.size + b.size - intersection)
}

function rounded(value: number) {
  return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100
}

function signedRounded(value: number) {
  return Math.round(value * 100) / 100
}

function relationshipCore(value: unknown) {
  return normalized(value).replace(/(?:纠纷|关系)$/, '')
}

function bestCoverage(expected: string, actual: string[]): CoverageItem {
  let best = ''
  let score = 0
  for (const candidate of actual) {
    const candidateScore = similarity(expected, candidate)
    if (candidateScore > score) {
      best = candidate
      score = candidateScore
    }
  }
  return { expected, actual: best, score: rounded(score * 100) }
}

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function coverage(expected: string[], actual: string[]) {
  return expected.map((item) => bestCoverage(item, actual))
}

function matchValues(pattern: RegExp, value: unknown) {
  return Array.from(new Set(strings(value).flatMap((text) => Array.from(text.matchAll(pattern), (match) => match[0]))))
}

function hallucination(actual: ComparableCaseUnderstanding, sourceText: string) {
  const amounts = matchValues(/(?:人民币\s*)?(?:\d+(?:\.\d+)?)(?:万|亿)?元/g, actual)
  const dates = matchValues(/\d{4}(?:年\d{1,2}月(?:\d{1,2}日)?|[-/]\d{1,2}(?:[-/]\d{1,2})?)/g, actual)
  const compactSource = normalized(sourceText)
  const canonicalDate = (value: string) => {
    const parts = value.match(/(\d{4})\D+(\d{1,2})(?:\D+(\d{1,2}))?/)
    return parts ? `${parts[1]}-${String(Number(parts[2])).padStart(2, '0')}-${String(Number(parts[3] || 1)).padStart(2, '0')}` : value
  }
  const sourceDates = new Set(matchValues(/\d{4}(?:年\d{1,2}月(?:\d{1,2}日)?|[-/]\d{1,2}(?:[-/]\d{1,2})?)/g, sourceText).map(canonicalDate))
  const unsupportedAmounts = amounts.filter((value) => !compactSource.includes(normalized(value)))
  const unsupportedDates = dates.filter((value) => {
    const canonical = canonicalDate(value)
    if (sourceDates.has(canonical)) return false
    const parts = canonical.match(/^\d{4}-(\d{2})-(\d{2})$/)
    if (!parts) return true
    const month = String(Number(parts[1]))
    const day = String(Number(parts[2]))
    return !sourceText.includes(`${month}月${day}日`)
  })
  return {
    score: rounded(100 - Math.min(100, (unsupportedAmounts.length + unsupportedDates.length) * 25)),
    unsupportedAmounts,
    unsupportedDates,
    note: 'Heuristic grounding check for explicit amounts and dates; semantic hallucinations still require reviewer inspection.',
  }
}

export function caseModelToComparable(model: CaseModel): ComparableCaseUnderstanding {
  return {
    caseIdentity: model.identity,
    narrative: model.narrative,
    actors: model.actors,
    timeline: model.timeline,
    conflicts: model.conflicts,
    unknowns: model.unknowns,
  }
}

export function caseUnderstandingToComparable(result: StoredCaseUnderstanding): ComparableCaseUnderstanding {
  if ('caseIdentity' in result) return result
  return {
    caseIdentity: {
      caseId: '',
      ...result.identity,
    },
    narrative: result.narrative,
    actors: result.actors,
    timeline: result.timeline,
    conflicts: result.conflicts,
    unknowns: result.unknowns,
  }
}

export function evaluateCaseUnderstanding(
  actual: ComparableCaseUnderstanding,
  golden: CaseModel,
  sourceText: string,
): EvaluationDimensions {
  const goldenComparable = caseModelToComparable(golden)
  const expectedNames = goldenComparable.actors.map((actor) => actor.name)
  const actualNames = actual.actors.map((actor) => actor.name)
  const matchedNames = expectedNames.filter((name) => actualNames.some((actualName) => (
    normalized(actualName).includes(normalized(name)) || normalized(name).includes(normalized(actualName))
  )))
  const subjectCoverage = expectedNames.length > 0 ? matchedNames.length / expectedNames.length : 1
  const caseType = relationshipCore(goldenComparable.caseIdentity.caseType)
    && relationshipCore(goldenComparable.caseIdentity.caseType) === relationshipCore(actual.caseIdentity.caseType)
    ? { expected: goldenComparable.caseIdentity.caseType, actual: actual.caseIdentity.caseType, score: 100 }
    : bestCoverage(goldenComparable.caseIdentity.caseType, [actual.caseIdentity.caseType])
  const relationshipExpected = `${goldenComparable.caseIdentity.caseType} ${goldenComparable.narrative.background}`
  const relationshipActual = `${actual.caseIdentity.caseType} ${actual.narrative.background}`
  const legalRelationship = bestCoverage(relationshipExpected, [relationshipActual])
  const identityScore = rounded(average([caseType.score, subjectCoverage * 100, legalRelationship.score]))

  const expectedNarrative = strings(goldenComparable.narrative).join(' ')
  const actualNarrative = strings(actual.narrative).join(' ')
  const mainLine = bestCoverage(expectedNarrative, [actualNarrative])
  const timelineCoverage = coverage(
    goldenComparable.timeline.map((item) => `${item.date} ${item.event}`),
    actual.timeline.map((item) => `${item.date} ${item.event}`),
  )
  const conflictCoverage = coverage(
    goldenComparable.conflicts.map((item) => `${item.title} ${item.description}`),
    actual.conflicts.map((item) => `${item.title} ${item.description}`),
  )
  const unknownCoverage = coverage(
    goldenComparable.unknowns.map((item) => item.question),
    actual.unknowns.map((item) => item.question),
  )
  const hallucinationResult = hallucination(actual, sourceText)
  const actorsScore = rounded(subjectCoverage * 100)
  const timelineScore = rounded(average(timelineCoverage.map((item) => item.score)))
  const conflictsScore = rounded(average(conflictCoverage.map((item) => item.score)))
  const unknownsScore = rounded(average(unknownCoverage.map((item) => item.score)))
  const overall = rounded(average([
    identityScore,
    mainLine.score,
    actorsScore,
    timelineScore,
    conflictsScore,
    unknownsScore,
    hallucinationResult.score,
  ]))

  return {
    overall,
    caseIdentity: {
      score: identityScore,
      caseType,
      subjects: { expected: expectedNames, actual: actualNames, coverage: rounded(subjectCoverage * 100) },
      legalRelationship,
    },
    narrative: { score: mainLine.score, mainLine },
    actors: {
      score: actorsScore,
      expected: expectedNames,
      actual: actualNames,
      missing: expectedNames.filter((name) => !matchedNames.includes(name)),
    },
    timeline: { score: timelineScore, coverage: timelineCoverage },
    conflicts: { score: conflictsScore, coverage: conflictCoverage },
    unknowns: { score: unknownsScore, coverage: unknownCoverage },
    hallucination: hallucinationResult,
  }
}

export function compareContextEngine(
  baseline: ComparableCaseUnderstanding,
  contextEngine: ComparableCaseUnderstanding,
  golden: CaseModel,
  sourceText: string,
): ContextEngineComparisonReport {
  const baselineEvaluation = evaluateCaseUnderstanding(baseline, golden, sourceText)
  const contextEngineEvaluation = evaluateCaseUnderstanding(contextEngine, golden, sourceText)
  const delta = signedRounded(contextEngineEvaluation.overall - baselineEvaluation.overall)
  return {
    baselineScore: baselineEvaluation.overall,
    contextEngineScore: contextEngineEvaluation.overall,
    delta,
    recovered: contextEngineEvaluation.caseIdentity.caseType.score >= 60
      && contextEngineEvaluation.hallucination.score === 100
      && delta >= -10,
    baseline: baselineEvaluation,
    contextEngine: contextEngineEvaluation,
  }
}
