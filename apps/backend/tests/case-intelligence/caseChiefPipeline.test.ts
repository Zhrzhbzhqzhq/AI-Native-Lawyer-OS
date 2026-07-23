import { describe, expect, it } from 'vitest'
import CaseModelValidator from '../../src/services/case-intelligence/CaseModelValidator'
import { CaseChiefPipeline, MockCaseIntelligenceProvider } from '../../src/services/case-intelligence/pipeline'

describe('Case Chief Pipeline', () => {
  it('completes Material to CaseModel with mock data only', async () => {
    const pipeline = new CaseChiefPipeline(new MockCaseIntelligenceProvider())
    const result = await pipeline.run({
      case_id: 'case-001',
      title: '合同履行争议',
      context: [{ id: 'material-1', title: '合同材料', content: '双方签订合同。' }],
    })
    expect(result.context.materials).toEqual([{ id: 'material-1', title: '合同材料', content: '双方签订合同。' }])
    expect(result.context.completedStages).toEqual(['material', 'identity', 'narrative', 'actor', 'conflict', 'factor', 'risk', 'review'])
    expect(result.context.completedStages.filter((stage) => ['material', 'identity', 'narrative', 'conflict', 'factor', 'risk'].includes(stage)))
      .toEqual(['material', 'identity', 'narrative', 'conflict', 'factor', 'risk'])
    expect(result.model.identity.caseId).toBe('case-001')
    expect(result.model.actors[0].name).toBe('【待确认主体】')
    expect(new CaseModelValidator().validate(result.model).ok).toBe(true)
  })
})
