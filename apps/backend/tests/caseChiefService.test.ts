import { describe, expect, it } from 'vitest'
import CaseChiefService from '../src/services/case-intelligence/CaseChiefService'
import { CASE_MODEL_FIELDS, CASE_MODEL_FORBIDDEN_FIELDS } from '../src/services/case-intelligence/CaseModelSchema'

describe('CaseChiefService.generateCaseModel', () => {
  it('runs Material through the default pipeline and returns complete CaseModel JSON', async () => {
    const model = await new CaseChiefService().generateCaseModel({
      case_id: 'case-chief-1',
      title: '合同履行争议',
      context: [{ id: 'material-1', title: '合同材料', content: '材料内容' }],
    })
    expect(Object.keys(model)).toEqual(CASE_MODEL_FIELDS)
    expect(model.identity).toMatchObject({ caseId: 'case-chief-1', title: '合同履行争议' })
    expect(model.selfReview.requiresLawyerReview).toBe(true)
    expect(() => JSON.parse(JSON.stringify(model))).not.toThrow()
    for (const field of CASE_MODEL_FORBIDDEN_FIELDS) expect(model).not.toHaveProperty(field)
  })

  it('rejects an invalid pipeline model instead of returning partial output', async () => {
    const service = new CaseChiefService({ buildModel: async () => ({ identity: {} }) as any })
    await expect(service.generateCaseModel({ case_id: 'case-chief-2', title: '案件', context: [] }))
      .rejects.toMatchObject({ code: 'case_model_invalid' })
  })
})
