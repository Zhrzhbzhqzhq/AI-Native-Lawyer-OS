import { describe, expect, it } from 'vitest'
import DecisionFactorGroundingNormalizer from '../../src/services/case-intelligence/enhancement/DecisionFactorGroundingNormalizer'
import { mockCaseModel } from './caseModel.fixture'

describe('DecisionFactorGroundingNormalizer', () => {
  it('keeps valid sources and standardizes a string to sourceRefs array', () => {
    const model = mockCaseModel()
    const factor = model.decisionFactors[0]
    const review = [{
      decisionFactorId: factor.id,
      supportStatus: 'supported' as const,
      sourceRefs: 'material-contract',
      notes: '合同材料支持该因素。',
    }]

    const result = new DecisionFactorGroundingNormalizer().normalize(
      model.decisionFactors,
      review,
      ['material-contract'],
    )

    expect(result.normalizedReview[0].sourceRefs).toEqual(['material-contract'])
    expect(result.normalizedReview[0].supportStatus).toBe('supported')
    expect(result.warnings).toEqual([])
  })

  it('removes invalid sources without changing the DecisionFactors or input review', () => {
    const model = mockCaseModel()
    const decisionFactorsSnapshot = structuredClone(model.decisionFactors)
    const review = [{
      decisionFactorId: model.decisionFactors[0].id,
      supportStatus: 'supported' as const,
      sourceRefs: ['material-contract', 'material-external'],
      notes: '材料审核。',
    }]
    const reviewSnapshot = structuredClone(review)

    const result = new DecisionFactorGroundingNormalizer().normalize(
      model.decisionFactors,
      review,
      ['material-contract'],
    )

    expect(result.normalizedReview[0].sourceRefs).toEqual(['material-contract'])
    expect(model.decisionFactors).toEqual(decisionFactorsSnapshot)
    expect(review).toEqual(reviewSnapshot)
  })

  it('downgrades support status to missing_evidence when no valid source remains', () => {
    const model = mockCaseModel()
    const review = [{
      decisionFactorId: model.decisionFactors[0].id,
      supportStatus: 'supported' as const,
      sourceRefs: ['material-external'],
      notes: '缺少可用材料。',
    }]

    const result = new DecisionFactorGroundingNormalizer().normalize(
      model.decisionFactors,
      review,
      ['material-contract'],
    )

    expect(result.normalizedReview[0]).toMatchObject({
      supportStatus: 'missing_evidence',
      sourceRefs: [],
    })
  })

  it('generates a warning for every removed invalid source reference', () => {
    const model = mockCaseModel()
    const factorId = model.decisionFactors[0].id
    const review = [{
      decisionFactorId: factorId,
      supportStatus: 'unsupported' as const,
      sourceRefs: ['material-external', 7, ' '],
      notes: '来源需要清理。',
    }]

    const result = new DecisionFactorGroundingNormalizer().normalize(
      model.decisionFactors,
      review,
      [],
    )

    expect(result.warnings).toHaveLength(3)
    expect(result.warnings.map((warning) => warning.code))
      .toEqual(['invalid_source_ref_removed', 'invalid_source_ref_removed', 'invalid_source_ref_removed'])
    expect(result.warnings[0]).toMatchObject({
      decisionFactorId: factorId,
      sourceRef: 'material-external',
    })
  })
})
