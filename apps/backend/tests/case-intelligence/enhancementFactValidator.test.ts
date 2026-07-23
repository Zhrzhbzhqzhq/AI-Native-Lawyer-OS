import { describe, expect, it } from 'vitest'
import EnhancementFactValidator from '../../src/services/case-intelligence/enhancement/EnhancementFactValidator'
import { mockCaseModel } from './caseModel.fixture'

function baseWithAmount() {
  const base = mockCaseModel()
  base.narrative.background = '合同约定月租金6000元。'
  return base
}

describe('EnhancementFactValidator', () => {
  it('allows new content grounded by an explicit Base amount, date and actor', () => {
    const base = baseWithAmount()
    const enhanced = structuredClone(base)
    enhanced.decisionFactors[0].description = 'actor-1 于2026-01-01确认月租金6000元。'

    expect(new EnhancementFactValidator().validate(base, enhanced)).toEqual({
      ok: true,
      issues: [],
    })
  })

  it('allows a correctly derived amount based on a Base amount', () => {
    const base = baseWithAmount()
    const enhanced = structuredClone(base)
    enhanced.decisionFactors[0].description = '六日租金为1200元（6000元÷30×6）。'

    expect(new EnhancementFactValidator().validate(base, enhanced).ok).toBe(true)
  })

  it('rejects unsupported and mismatched new amounts', () => {
    const base = baseWithAmount()
    const unsupported = structuredClone(base)
    unsupported.decisionFactors[0].description = '新增金额9000元没有依据。'
    const mismatch = structuredClone(base)
    mismatch.decisionFactors[0].description = '六日租金为1000元（6000元÷30×6）。'

    expect(new EnhancementFactValidator().validate(base, unsupported).issues)
      .toContainEqual(expect.objectContaining({ code: 'enhancement_amount_unsupported' }))
    expect(new EnhancementFactValidator().validate(base, mismatch).issues)
      .toContainEqual(expect.objectContaining({
        code: 'enhancement_amount_derivation_mismatch',
      }))
  })

  it('rejects a new date and actor absent from Base CaseModel', () => {
    const base = mockCaseModel()
    const enhanced = structuredClone(base)
    enhanced.actors.push({
      id: 'actor-new',
      name: '新主体',
      role: '案外人',
      position: '材料未记载。',
    })
    enhanced.decisionFactors[0].description = 'actor-new 于2026-02-02参与事项。'
    const result = new EnhancementFactValidator().validate(base, enhanced)

    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'enhancement_date_unsupported' }),
      expect.objectContaining({ code: 'enhancement_actor_unsupported' }),
    ]))
  })

  it('does not revalidate unsupported content already present in Base CaseModel', () => {
    const base = mockCaseModel()
    base.narrative.summary = 'Base 已有未经本层复核的金额99999元。'
    const enhanced = structuredClone(base)
    enhanced.decisionFactors[0].label = '仅调整分析标签'

    expect(new EnhancementFactValidator().validate(base, enhanced).ok).toBe(true)
  })
})
