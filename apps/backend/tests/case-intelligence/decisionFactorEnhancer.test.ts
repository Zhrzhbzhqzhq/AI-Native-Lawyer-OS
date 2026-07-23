import { describe, expect, it, vi } from 'vitest'
import CaseModelValidator from '../../src/services/case-intelligence/CaseModelValidator'
import DecisionFactorEnhancer from '../../src/services/case-intelligence/enhancement/DecisionFactorEnhancer'
import { mockCaseModel } from './caseModel.fixture'

const input = {
  case_id: 'case-001',
  title: '设备买卖合同纠纷',
  context: [{ id: 'material-contract', content: '买方认为设备未达约定产能，卖方认为现场条件影响产能。' }],
}

describe('DecisionFactorEnhancer', () => {
  it('enhances only decisionFactors and preserves every other CaseModel field', async () => {
    const model = mockCaseModel()
    const decisionFactors = [{
      id: 'factor-enhanced-1',
      label: '合同约定产能与测试记录',
      description: `需要结合 material-contract 与 ${model.timeline[0].id} 核对设备实际产能。`,
      impact: 'uncertain',
    }]
    const generator = { generate: vi.fn().mockResolvedValue({ response: { decisionFactors } }) }

    const enhanced = await new DecisionFactorEnhancer(generator).enhance(input, model)

    expect(enhanced).not.toBe(model)
    expect(enhanced.decisionFactors).toEqual(decisionFactors)
    expect(enhanced.identity).toBe(model.identity)
    expect(enhanced.narrative).toBe(model.narrative)
    expect(enhanced.actors).toBe(model.actors)
    expect(enhanced.timeline).toBe(model.timeline)
    expect(enhanced.conflicts).toBe(model.conflicts)
    expect(enhanced.risks).toBe(model.risks)
    expect(enhanced.unknowns).toBe(model.unknowns)
    expect(enhanced.selfReview).toBe(model.selfReview)
    expect(new CaseModelValidator().validate(enhanced).ok).toBe(true)
    expect(generator.generate).toHaveBeenCalledWith(expect.objectContaining({
      prompt_version: 'case-intelligence-decision-factor-enhancement-v2',
      task: 'case_intelligence_decision_factor_enhancement',
    }))
    const userPrompt = generator.generate.mock.calls[0][0].user_prompt
    expect(userPrompt).toContain('已有 actors、timeline、事实性文本、金额和日期')
    expect(userPrompt).toContain('禁止在 description 中新增任何日期、金额、主体、事件或证据')
    expect(userPrompt).toContain('uncertainty/notes')
    expect(userPrompt).toContain('不得扩展案件事实集合')
  })

  it('rejects actor or fact references outside the CaseModel and CaseInput', async () => {
    const model = mockCaseModel()
    const generator = {
      generate: vi.fn().mockResolvedValue({
        response: [{
          id: 'factor-invalid-reference',
          label: '外部主体陈述',
          description: 'actor-external 根据 fact-external 提出了新的事实。',
          impact: 'uncertain',
        }],
      }),
    }

    await expect(new DecisionFactorEnhancer(generator).enhance(input, model))
      .rejects.toMatchObject({
        message: 'decision_factor_reference_invalid',
        failingStage: 'decision_factor_enhancement',
        invalidReferences: ['actor-external', 'fact-external'],
      })
  })

  it('runs Enhancement Fact governance after DecisionFactor generation', async () => {
    const model = mockCaseModel()
    model.narrative.background = '合同约定月租金6000元。'
    const generator = {
      generate: vi.fn().mockResolvedValue({
        response: [{
          id: 'factor-unsupported-amount',
          label: '材料外金额',
          description: '新增金额9000元没有材料或计算依据。',
          impact: 'uncertain',
        }],
      }),
    }

    await expect(new DecisionFactorEnhancer(generator).enhance(input, model))
      .rejects.toMatchObject({
        message: 'enhancement_fact_invalid',
        failingStage: 'enhancement_fact_validation',
        schemaValidationError: {
          issues: [expect.objectContaining({ code: 'enhancement_amount_unsupported' })],
        },
      })
  })

  it('normalizes a single DecisionFactor object before content validation', async () => {
    const model = mockCaseModel()
    const factor = {
      id: 'factor-single',
      label: '合同内容',
      description: '仅分析双方对已有合同履行范围争议的影响。',
      impact: 'uncertain',
    }
    const generator = {
      generate: vi.fn().mockResolvedValue({ response: { decisionFactors: factor } }),
    }

    await expect(new DecisionFactorEnhancer(generator).enhance(input, model))
      .resolves.toMatchObject({ decisionFactors: [factor] })
  })

  it('normalizes a missing DecisionFactor output to an empty array', async () => {
    const generator = { generate: vi.fn().mockResolvedValue({ response: {} }) }

    await expect(new DecisionFactorEnhancer(generator).enhance(input, mockCaseModel()))
      .resolves.toMatchObject({ decisionFactors: [] })
  })

  it('rejects decision factors that violate the existing CaseModel Schema', async () => {
    const generator = {
      generate: vi.fn().mockResolvedValue({
        response: [{ id: 'factor-invalid', label: '', description: '', impact: 'likely-win' }],
      }),
    }

    await expect(new DecisionFactorEnhancer(generator).enhance(input, mockCaseModel()))
      .rejects.toMatchObject({
        message: 'decision_factor_enhancement_invalid',
        failingStage: 'decision_factor_enhancement',
      })
  })
})
