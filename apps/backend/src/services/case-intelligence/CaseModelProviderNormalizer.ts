import type { CaseModel } from './types/caseModel.types'

function stringMissing(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
}

function requiredString<T>(value: T): T | string {
  return stringMissing(value) ? 'unknown' : value
}

function normalizeCertainty(value: unknown): unknown {
  const certainty = typeof value === 'string' ? value.trim().toLowerCase() : value
  if (['confirmed', '确定', 'certain', '已确认'].includes(String(certainty))) return 'confirmed'
  if (['disputed', '存在争议'].includes(String(certainty))) return 'disputed'
  if (['unknown', '未知', '待确认'].includes(String(certainty))) return 'unknown'
  return value
}

function normalizeConfidence(value: unknown): unknown {
  if (typeof value === 'number') {
    if (value >= 0 && value <= 1) return value
    if (value > 1 && value <= 100) return value / 100
    return value
  }

  if (typeof value !== 'string') return value
  const confidence = value.trim().toLowerCase()
  const levels: Readonly<Record<string, number>> = {
    high: 0.9,
    medium: 0.5,
    low: 0.2,
    高: 0.9,
    中: 0.5,
    低: 0.2,
  }
  if (confidence in levels) return levels[confidence]

  const percentage = confidence.match(/^(\d+(?:\.\d+)?)%$/)
  if (percentage) {
    const number = Number(percentage[1])
    return number <= 100 ? number / 100 : value
  }

  const number = Number(confidence)
  if (Number.isFinite(number) && number >= 0 && number <= 1) return number
  return value
}

function normalizeImpact(value: unknown): CaseModel['decisionFactors'][number]['impact'] {
  return value === 'supportive' || value === 'adverse' || value === 'neutral'
    ? value
    : 'uncertain'
}

function normalizeSeverity(value: unknown): unknown {
  const severity: Readonly<Record<string, string>> = {
    高: 'high',
    中: 'medium',
    低: 'low',
  }
  return typeof value === 'string' && value in severity ? severity[value] : value
}

export class CaseModelProviderNormalizer {
  normalize(model: CaseModel): CaseModel {
    let changed = false
    const identityValues = {
      title: requiredString(model.identity.title) as string,
      caseType: requiredString(model.identity.caseType) as string,
      stage: requiredString(model.identity.stage) as string,
      jurisdiction: requiredString(model.identity.jurisdiction) as string,
    }
    const identityChanged = Object.entries(identityValues)
      .some(([field, value]) => value !== model.identity[field as keyof typeof identityValues])
    if (identityChanged) changed = true
    const identity = identityChanged ? { ...model.identity, ...identityValues } : model.identity

    const narrativeValues = {
      summary: requiredString(model.narrative.summary) as string,
      background: requiredString(model.narrative.background) as string,
      currentPosture: requiredString(model.narrative.currentPosture) as string,
    }
    const narrativeChanged = Object.entries(narrativeValues)
      .some(([field, value]) => value !== model.narrative[field as keyof typeof narrativeValues])
    if (narrativeChanged) changed = true
    const narrative = narrativeChanged ? { ...model.narrative, ...narrativeValues } : model.narrative

    const timeline = model.timeline.map((item) => {
      const date = stringMissing(item.date) ? 'unknown' : item.date
      const certainty = normalizeCertainty(item.certainty) as typeof item.certainty
      if (date === item.date && certainty === item.certainty) return item
      changed = true
      return { ...item, date, certainty }
    })

    const decisionFactors = model.decisionFactors.map((item) => {
      const impact = normalizeImpact(item.impact)
      if (impact === item.impact) return item
      changed = true
      return { ...item, impact }
    })

    const risks = model.risks.map((item) => {
      const severity = normalizeSeverity(item.severity) as typeof item.severity
      if (severity === item.severity) return item
      changed = true
      return { ...item, severity }
    })

    const confidence = normalizeConfidence(model.selfReview.confidence) as number
    if (confidence !== model.selfReview.confidence) changed = true

    if (!changed) return model

    return {
      ...model,
      identity,
      narrative,
      timeline,
      decisionFactors,
      risks,
      selfReview: {
        ...model.selfReview,
        confidence,
      },
    }
  }
}

export default CaseModelProviderNormalizer
