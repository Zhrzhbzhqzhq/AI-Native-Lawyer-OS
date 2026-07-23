function objectValue(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function decisionFactorObject(value: Record<string, unknown>): boolean {
  return ['id', 'label', 'description', 'impact'].some((field) => field in value)
}

export class DecisionFactorOutputNormalizer {
  normalize(value: unknown): unknown[] {
    if (value === null || value === undefined) return []
    if (Array.isArray(value)) return value
    if (!objectValue(value)) throw new Error('decision_factor_output_invalid')

    if ('decisionFactors' in value) {
      if (value.decisionFactors === null || value.decisionFactors === undefined) return []
      if (Array.isArray(value.decisionFactors)) return value.decisionFactors
      if (objectValue(value.decisionFactors)) return [value.decisionFactors]
      throw new Error('decision_factor_output_invalid')
    }

    if (decisionFactorObject(value)) return [value]
    return []
  }
}

export default DecisionFactorOutputNormalizer
