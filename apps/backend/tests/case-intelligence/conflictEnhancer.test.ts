import { describe, expect, it, vi } from 'vitest'
import CaseModelValidator from '../../src/services/case-intelligence/CaseModelValidator'
import ConflictEnhancer from '../../src/services/case-intelligence/enhancement/ConflictEnhancer'
import { mockCaseModel } from './caseModel.fixture'

const input = {
  case_id: 'case-001',
  title: '设备买卖合同纠纷',
  context: [{ content: '买方认为设备未达约定产能，卖方认为现场条件影响产能。' }],
}

describe('ConflictEnhancer', () => {
  it('enhances only conflicts and preserves every other CaseModel field', async () => {
    const model = mockCaseModel()
    const conflicts = [{
      id: 'conflict-enhanced-1',
      title: '设备产能是否达标',
      description: '买方认为设备未达约定产能，卖方认为现场条件影响产能。',
      actorIds: model.actors.map((actor) => actor.id),
    }]
    const generator = { generate: vi.fn().mockResolvedValue({ response: conflicts }) }

    const enhanced = await new ConflictEnhancer(generator).enhance(input, model)

    expect(enhanced).not.toBe(model)
    expect(enhanced.conflicts).toEqual(conflicts)
    expect(enhanced.identity).toBe(model.identity)
    expect(enhanced.narrative).toBe(model.narrative)
    expect(enhanced.actors).toBe(model.actors)
    expect(enhanced.timeline).toBe(model.timeline)
    expect(enhanced.decisionFactors).toBe(model.decisionFactors)
    expect(enhanced.risks).toBe(model.risks)
    expect(enhanced.unknowns).toBe(model.unknowns)
    expect(enhanced.selfReview).toBe(model.selfReview)
    expect(new CaseModelValidator().validate(enhanced).ok).toBe(true)
    expect(generator.generate).toHaveBeenCalledWith(expect.objectContaining({
      prompt_version: 'case-intelligence-conflict-enhancement-v1',
      task: 'case_intelligence_conflict_enhancement',
    }))
  })

  it('rejects enhanced conflicts that violate the existing CaseModel Schema', async () => {
    const model = mockCaseModel()
    const generator = {
      generate: vi.fn().mockResolvedValue({
        response: { conflicts: 42 },
      }),
    }

    await expect(new ConflictEnhancer(generator).enhance(input, model))
      .rejects.toMatchObject({
        message: 'conflict_enhancement_output_invalid',
      })
  })

  it('keeps strict CaseModelValidator checks after normalization', async () => {
    const model = mockCaseModel()
    const duplicate = {
      id: 'conflict-duplicate',
      title: '重复争议',
      description: '重复争议内容',
      actorIds: model.actors.map((actor) => actor.id),
    }
    const generator = {
      generate: vi.fn().mockResolvedValue({ response: [duplicate, duplicate] }),
    }

    await expect(new ConflictEnhancer(generator).enhance(input, model))
      .rejects.toMatchObject({
        message: 'conflict_enhancement_invalid',
        failingStage: 'conflict_enhancement',
      })
  })
})
