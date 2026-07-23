function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeEnum(value: unknown, values: Readonly<Record<string, string>>) {
  const key = String(value ?? '').trim()
  return values[key] || value
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    const text = value.trim()
    return text ? [text] : []
  }
  return []
}

function normalizeCertainty(value: unknown) {
  const text = String(value ?? '').trim().toLowerCase()
  if (!text) return value
  if (['confirmed', 'certain', 'high', '高', '确定', '已确认'].includes(text)
    || /(?:已)?(?:确定|确认|明确|证实)/.test(text)) return 'confirmed'
  if (['disputed', 'uncertain', '存在争议', '有争议', '存疑'].includes(text)
    || /(?:争议|存疑|无法确定|不确定)/.test(text)) return 'disputed'
  if (['unknown', '未知', '不详', '不明'].includes(text)
    || /(?:未知|不详|不明|尚不清楚)/.test(text)) return 'unknown'
  return value
}

function normalizeImpact(value: unknown) {
  const text = String(value ?? '').trim().toLowerCase()
  if (!text) return value
  if (text === 'supportive' || text === '有利') return 'supportive'
  if (text === 'adverse' || text === '不利') return 'adverse'
  if (text === 'neutral' || text === '中性') return 'neutral'
  return 'uncertain'
}

function normalizeConfidence(value: unknown) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  const levels: Readonly<Record<string, number>> = {
    high: 0.9,
    medium: 0.5,
    low: 0.2,
    高: 0.9,
    中: 0.5,
    低: 0.2,
  }
  if (text in levels) return levels[text]
  const parsed = typeof value === 'string'
    ? Number(text.replace(/%$/, ''))
    : Number(value)
  if (!Number.isFinite(parsed)) return value
  return parsed > 1 && parsed <= 100 ? parsed / 100 : parsed
}

const LEVEL = {
  high: 'high',
  medium: 'medium',
  low: 'low',
  高: 'high',
  中: 'medium',
  低: 'low',
} as const

export function normalizeCaseModel(value: unknown): unknown {
  if (!isObject(value)) return value
  const normalized: Record<string, unknown> = { ...value }

  if (Array.isArray(value.timeline)) {
    normalized.timeline = value.timeline.map((item) => isObject(item)
      ? { ...item, certainty: normalizeCertainty(item.certainty) }
      : item)
  }
  if (Array.isArray(value.decisionFactors)) {
    normalized.decisionFactors = value.decisionFactors.map((item) => isObject(item)
      ? { ...item, impact: normalizeImpact(item.impact) }
      : item)
  }
  if (Array.isArray(value.risks)) {
    normalized.risks = value.risks.map((item) => isObject(item)
      ? { ...item, severity: normalizeEnum(item.severity, LEVEL) }
      : item)
  }
  if (Array.isArray(value.unknowns)) {
    normalized.unknowns = value.unknowns.map((item) => isObject(item)
      ? { ...item, importance: normalizeEnum(item.importance, LEVEL) }
      : item)
  }
  if (isObject(value.selfReview)) {
    normalized.selfReview = {
      ...value.selfReview,
      confidence: normalizeConfidence(value.selfReview.confidence),
      limitations: normalizeStringArray(value.selfReview.limitations),
      assumptions: normalizeStringArray(value.selfReview.assumptions),
    }
  }

  return normalized
}

export default normalizeCaseModel
