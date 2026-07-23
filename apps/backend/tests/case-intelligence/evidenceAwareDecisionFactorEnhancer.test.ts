import { describe, expect, it, vi } from 'vitest'
import CaseModelValidator from '../../src/services/case-intelligence/CaseModelValidator'
import EvidenceAwareDecisionFactorEnhancer from '../../src/services/case-intelligence/enhancement/EvidenceAwareDecisionFactorEnhancer'
import { mockCaseModel } from './caseModel.fixture'

const input = {
  case_id: 'case-001',
  title: '设备买卖合同纠纷',
  context: [{ id: 'material-contract', content: '双方对设备产能存在争议。' }],
}

describe('EvidenceAwareDecisionFactorEnhancer', () => {
  it('requires each decision factor to be grounded in a conflict and existing source', async () => {
    const model = mockCaseModel()
    const conflicts = model.conflicts
    const decisionFactors = [{
      id: 'factor-grounded',
      label: '设备产能约定',
      description: '需要结合合同材料核对约定产能。',
      impact: 'neutral' as const,
    }]
    const generator = { generate: vi.fn().mockResolvedValue({ response: {
      decisionFactors,
      grounding: [{
        decisionFactorId: 'factor-grounded',
        conflictIds: [conflicts[0].id],
        sourceRefs: ['material-contract'],
        uncertainty: false,
      }],
    } }) }

    const enhanced = await new EvidenceAwareDecisionFactorEnhancer(generator)
      .enhance(input, model, conflicts)

    expect(enhanced.decisionFactors).toEqual(decisionFactors)
    expect(enhanced.identity).toBe(model.identity)
    expect(enhanced.conflicts).toBe(model.conflicts)
    expect(enhanced.risks).toBe(model.risks)
    expect(new CaseModelValidator().validate(enhanced).ok).toBe(true)
  })

  it('requires uncertainty when a decision factor has no supporting source', async () => {
    const model = mockCaseModel()
    const generator = { generate: vi.fn().mockResolvedValue({ response: {
      decisionFactors: [{
        id: 'factor-unsupported',
        label: '待核验因素',
        description: '现有材料不足，需要进一步核验。',
        impact: 'supportive',
      }],
      grounding: [{
        decisionFactorId: 'factor-unsupported',
        conflictIds: [model.conflicts[0].id],
        sourceRefs: [],
        uncertainty: false,
      }],
    } }) }

    await expect(new EvidenceAwareDecisionFactorEnhancer(generator)
      .enhance(input, model, model.conflicts))
      .rejects.toThrow('evidence_aware_uncertainty_required:factor-unsupported')
  })

  it('accepts an unsupported factor explicitly marked uncertain', async () => {
    const model = mockCaseModel()
    const decisionFactors = [{
      id: 'factor-uncertain',
      label: '待补充技术材料',
      description: '当前没有可关联的技术检测材料。',
      impact: 'uncertain' as const,
    }]
    const generator = { generate: vi.fn().mockResolvedValue({ response: {
      decisionFactors,
      grounding: [{
        decisionFactorId: 'factor-uncertain',
        conflictIds: [model.conflicts[0].id],
        sourceRefs: [],
        uncertainty: true,
      }],
    } }) }

    const enhanced = await new EvidenceAwareDecisionFactorEnhancer(generator)
      .enhance(input, model, model.conflicts)

    expect(enhanced.decisionFactors).toEqual(decisionFactors)
  })

  it('rejects conflict or source references that do not exist', async () => {
    const model = mockCaseModel()
    const response = {
      decisionFactors: [{
        id: 'factor-external',
        label: '外部材料因素',
        description: '引用不存在的材料。',
        impact: 'neutral',
      }],
      grounding: [{
        decisionFactorId: 'factor-external',
        conflictIds: [model.conflicts[0].id],
        sourceRefs: ['material-external'],
        uncertainty: false,
      }],
    }
    const generator = { generate: vi.fn().mockResolvedValue({ response }) }

    await expect(new EvidenceAwareDecisionFactorEnhancer(generator)
      .enhance(input, model, model.conflicts))
      .rejects.toThrow('evidence_aware_source_reference_invalid:factor-external')
  })
})
