import { describe, expect, it } from 'vitest'
import CaseModelValidator from '../src/services/case-intelligence/CaseModelValidator'
import {
  CaseChiefPipeline,
  MockCaseIntelligenceProvider,
  createCasePipelineContext,
  type CasePipelineStage,
} from '../src/services/case-intelligence/pipeline'

describe('Case Chief Pipeline', () => {
  it('runs every independent stage in order through CasePipelineContext', async () => {
    const pipeline = new CaseChiefPipeline()
    const result = await pipeline.run({
      case_id: 'case-1', title: '合同争议',
      context: [{ id: 'material-1', title: '合同', content: '合同内容' }],
    })
    expect(result.context.completedStages).toEqual(['material', 'identity', 'narrative', 'actor', 'conflict', 'factor', 'risk', 'review'])
    expect(result.context.materials).toEqual([{ id: 'material-1', title: '合同', content: '合同内容' }])
    expect(result.model.identity).toMatchObject({ caseId: 'case-1', title: '合同争议' })
    expect(result.model.selfReview.requiresLawyerReview).toBe(true)
    expect(new CaseModelValidator().validate(result.model).ok).toBe(true)
  })

  it('uses deterministic mock provider responses without calling real AI', async () => {
    const provider = new MockCaseIntelligenceProvider({
      identity: { caseId: 'case-2', title: '定制案件', caseType: '合同纠纷', stage: '诉前', jurisdiction: '中国大陆' },
      narrative: { summary: '定制摘要', background: '定制背景', currentPosture: '准备中' },
      actor: { actors: [{ id: 'a-1', name: '甲方', role: '委托人', position: '要求履行' }], timeline: [] },
      conflict: [{ id: 'c-1', title: '履行分歧', description: '双方存在分歧', actorIds: ['a-1'] }],
      factor: [{ id: 'f-1', label: '材料', description: '材料待核验', impact: 'uncertain' }],
      risk: [{ id: 'r-1', description: '材料不完整', severity: 'medium', mitigation: '补充材料' }],
      review: { unknowns: [{ id: 'u-1', question: '约定内容？', importance: 'high' }], selfReview: { confidence: 0.5, limitations: ['未核验'], assumptions: [], requiresLawyerReview: true } },
    })
    const result = await new CaseChiefPipeline(provider).run({ case_id: 'case-2', title: '输入标题', context: [] })
    expect(result.model.identity.title).toBe('定制案件')
    expect(result.model.actors).toHaveLength(1)
    expect(result.model.risks[0].severity).toBe('medium')
  })

  it('allows an independent stage to be replaced', async () => {
    const customStage: CasePipelineStage = {
      name: 'custom',
      async run(context) {
        return { ...context, completedStages: [...context.completedStages, 'custom'] }
      },
    }
    const context = createCasePipelineContext({ case_id: 'case-3', title: '案件', context: [] })
    const result = await customStage.run(context)
    expect(result.completedStages).toEqual(['custom'])
  })
})
