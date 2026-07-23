import { describe, expect, it, vi } from 'vitest'
import DecisionFactorEvidenceReviewer from '../../src/services/case-intelligence/enhancement/DecisionFactorEvidenceReviewer'
import { mockCaseModel } from './caseModel.fixture'

const input = {
  case_id: 'case-001',
  title: '设备买卖合同纠纷',
  context: [{ id: 'material-contract', content: '合同约定设备产能。' }],
}

describe('DecisionFactorEvidenceReviewer', () => {
  it('returns evidence review metadata without modifying either CaseModel', async () => {
    const base = mockCaseModel()
    const enhanced = structuredClone(base)
    const factorId = enhanced.decisionFactors[0].id
    const reviews = [{
      decisionFactorId: factorId,
      supportStatus: 'supported',
      sourceRefs: ['material-contract', base.timeline[0].id],
      notes: '合同材料及时间线记录可以支持该因素。',
    }]
    const generator = { generate: vi.fn().mockResolvedValue({ response: { reviews } }) }
    const baseSnapshot = structuredClone(base)
    const enhancedSnapshot = structuredClone(enhanced)

    await expect(new DecisionFactorEvidenceReviewer(generator).review(input, base, enhanced))
      .resolves.toEqual(reviews)
    expect(base).toEqual(baseSnapshot)
    expect(enhanced).toEqual(enhancedSnapshot)
    expect(generator.generate).toHaveBeenCalledWith(expect.objectContaining({
      task: 'case_intelligence_decision_factor_evidence_review',
    }))
  })

  it('rejects reviews that add or omit decision factor ids', async () => {
    const base = mockCaseModel()
    const generator = { generate: vi.fn().mockResolvedValue({ response: [{
      decisionFactorId: 'factor-new',
      supportStatus: 'missing_evidence',
      sourceRefs: [],
      notes: '缺少材料。',
    }] }) }

    await expect(new DecisionFactorEvidenceReviewer(generator).review(input, base, base))
      .rejects.toThrow('decision_factor_evidence_review_incomplete')
  })

  it('rejects source references outside existing materials, facts, evidence or timeline', async () => {
    const base = mockCaseModel()
    const factorId = base.decisionFactors[0].id
    const generator = { generate: vi.fn().mockResolvedValue({ response: [{
      decisionFactorId: factorId,
      supportStatus: 'supported',
      sourceRefs: ['material-external'],
      notes: '引用外部材料。',
    }] }) }

    await expect(new DecisionFactorEvidenceReviewer(generator).review(input, base, base))
      .rejects.toThrow(`decision_factor_evidence_source_invalid:${factorId}`)
  })

  it('rejects legal judgment or outcome prediction in review notes', async () => {
    const base = mockCaseModel()
    const factorId = base.decisionFactors[0].id
    const generator = { generate: vi.fn().mockResolvedValue({ response: [{
      decisionFactorId: factorId,
      supportStatus: 'supported',
      sourceRefs: ['material-contract'],
      notes: '该因素表明当事人必然胜诉。',
    }] }) }

    await expect(new DecisionFactorEvidenceReviewer(generator).review(input, base, base))
      .rejects.toThrow(`decision_factor_evidence_legal_judgment_forbidden:${factorId}`)
  })
})
