import { describe, expect, it, vi } from 'vitest'
import EnhancedV4BenchmarkProvider from '../../src/services/case-intelligence/benchmark/providers/EnhancedV4BenchmarkProvider'
import CaseModelValidator from '../../src/services/case-intelligence/CaseModelValidator'
import DecisionFactorEvidenceReviewer from '../../src/services/case-intelligence/enhancement/DecisionFactorEvidenceReviewer'
import DecisionFactorGroundingNormalizer from '../../src/services/case-intelligence/enhancement/DecisionFactorGroundingNormalizer'
import { mockCaseModel } from './caseModel.fixture'

const input = {
  case_id: 'case-001',
  title: '设备买卖合同纠纷',
  context: [{ id: 'material-contract', content: '双方对设备产能存在争议。' }],
}

describe('EnhancedV4BenchmarkProvider', () => {
  it('runs Direct, Conflict, DecisionFactor and Review in fixed order', async () => {
    const order: string[] = []
    const base = mockCaseModel()
    const conflictEnhanced = { ...base, conflicts: structuredClone(base.conflicts) }
    const enhancedV2 = {
      ...conflictEnhanced,
      decisionFactors: base.decisionFactors.map((factor) => ({
        ...factor,
        label: `${factor.label}-enhanced-v2`,
      })),
    }
    const reviews = [{
      decisionFactorId: enhancedV2.decisionFactors[0].id,
      supportStatus: 'supported' as const,
      sourceRefs: ['material-contract'],
      notes: '合同材料支持该因素。',
    }]
    const direct = { generateCaseModel: vi.fn(async () => { order.push('direct'); return base }) }
    const conflict = { enhance: vi.fn(async () => { order.push('conflict'); return conflictEnhanced }) }
    const decisionFactor = { enhance: vi.fn(async () => { order.push('decisionFactor'); return enhancedV2 }) }
    const reviewer = { review: vi.fn(async () => { order.push('review'); return reviews }) }
    const provider = new EnhancedV4BenchmarkProvider(direct, conflict, decisionFactor, reviewer)

    const result = await provider.generateCaseModel(input)

    expect(order).toEqual(['direct', 'conflict', 'decisionFactor', 'review'])
    expect(result).toBe(enhancedV2)
    expect(result.decisionFactors).toEqual(enhancedV2.decisionFactors)
    expect(result.decisionFactors).not.toEqual(base.decisionFactors)
    expect(reviewer.review).toHaveBeenCalledWith(input, base, enhancedV2)
    expect(provider.artifacts()).toEqual({
      decisionFactorReview: reviews,
      decisionFactorGroundingWarnings: [],
      afterConflictEnhancement: conflictEnhanced,
      afterDecisionFactorEnhancement: enhancedV2,
      afterReview: enhancedV2,
    })
  })

  it('rejects a Reviewer that modifies the Enhanced V2 CaseModel', async () => {
    const base = mockCaseModel()
    const direct = { generateCaseModel: vi.fn().mockResolvedValue(base) }
    const conflict = { enhance: vi.fn().mockResolvedValue(base) }
    const decisionFactor = { enhance: vi.fn().mockResolvedValue(base) }
    const reviewer = { review: vi.fn(async (_input, _base, enhanced) => {
      enhanced.identity.title = '被 Reviewer 修改'
      return []
    }) }

    await expect(new EnhancedV4BenchmarkProvider(
      direct,
      conflict,
      decisionFactor,
      reviewer,
    ).generateCaseModel(input)).rejects.toThrow('decision_factor_evidence_review_modified_case_model')
  })

  it('normalizes invalid source refs before strict Reviewer validation', async () => {
    const base = mockCaseModel()
    const factorId = base.decisionFactors[0].id
    const generator = { generate: vi.fn().mockResolvedValue({ response: [{
      decisionFactorId: factorId,
      supportStatus: 'supported',
      sourceRefs: ['material-outside-case'],
      notes: '模型返回了不存在的材料引用。',
      decisionFactors: [{ id: 'factor-generated-by-reviewer' }],
    }] }) }
    const reviewer = new DecisionFactorEvidenceReviewer(generator, {
      groundingNormalizer: new DecisionFactorGroundingNormalizer(),
    })
    const provider = new EnhancedV4BenchmarkProvider(
      { generateCaseModel: vi.fn().mockResolvedValue(base) },
      { enhance: vi.fn().mockResolvedValue(base) },
      { enhance: vi.fn().mockResolvedValue(base) },
      reviewer,
    )

    const result = await provider.generateCaseModel(input)
    const artifacts = provider.artifacts()

    expect(artifacts.decisionFactorReview).toEqual([{
      decisionFactorId: factorId,
      supportStatus: 'missing_evidence',
      sourceRefs: [],
      notes: '模型返回了不存在的材料引用。',
    }])
    expect(artifacts.decisionFactorGroundingWarnings).toEqual([expect.objectContaining({
      code: 'invalid_source_ref_removed',
      decisionFactorId: factorId,
      sourceRef: 'material-outside-case',
    })])
    expect(new CaseModelValidator().validate(result).ok).toBe(true)
  })
})
