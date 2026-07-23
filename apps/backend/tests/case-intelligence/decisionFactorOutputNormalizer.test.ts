import { describe, expect, it } from 'vitest'
import DecisionFactorOutputNormalizer from '../../src/services/case-intelligence/enhancement/DecisionFactorOutputNormalizer'

const factor = {
  id: 'factor-1',
  label: '合同内容',
  description: '需要核对合同内容。',
  impact: 'uncertain',
}

describe('DecisionFactorOutputNormalizer', () => {
  it('normalizes a missing decisionFactors field to an empty array', () => {
    const normalizer = new DecisionFactorOutputNormalizer()

    expect(normalizer.normalize(undefined)).toEqual([])
    expect(normalizer.normalize({})).toEqual([])
    expect(normalizer.normalize({ decisionFactors: null })).toEqual([])
  })

  it('wraps a single decisionFactor object without changing its content', () => {
    const normalized = new DecisionFactorOutputNormalizer().normalize({
      decisionFactors: factor,
    })

    expect(normalized).toEqual([factor])
    expect(normalized[0]).toBe(factor)
  })

  it('accepts a bare single decisionFactor object', () => {
    const normalized = new DecisionFactorOutputNormalizer().normalize(factor)

    expect(normalized).toEqual([factor])
    expect(normalized[0]).toBe(factor)
  })

  it('keeps a decisionFactors array unchanged', () => {
    const factors = [factor]
    const normalizer = new DecisionFactorOutputNormalizer()

    expect(normalizer.normalize(factors)).toBe(factors)
    expect(normalizer.normalize({ decisionFactors: factors })).toBe(factors)
  })

  it('rejects an unsupported output container', () => {
    expect(() => new DecisionFactorOutputNormalizer().normalize('factor'))
      .toThrow('decision_factor_output_invalid')
  })
})
