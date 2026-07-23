import { describe, expect, it } from 'vitest'
import CaseChiefService from '../src/services/case-intelligence/CaseChiefService'
import CaseEvaluationService from '../src/services/case-intelligence/CaseEvaluationService'
import { CASE_MODEL_FIELDS, CASE_MODEL_FORBIDDEN_FIELDS } from '../src/services/case-intelligence/CaseModelSchema'
import CaseModelValidator from '../src/services/case-intelligence/CaseModelValidator'
import { buildCaseIntelligencePrompt } from '../src/services/case-intelligence/prompts'
import type { CaseModel } from '../src/services/case-intelligence/types/caseModel.types'

function validModel(): CaseModel {
  return {
    identity: { caseId: 'case-1', title: '合同纠纷', caseType: '合同纠纷', stage: '诉前', jurisdiction: '待确认' },
    narrative: { summary: '双方对合同履行存在争议。', background: '双方曾建立合同关系。', currentPosture: '正在整理材料。' },
    actors: [{ id: 'actor-1', name: '甲方', role: '申请方', position: '主张对方继续履行。' }],
    timeline: [{ id: 'time-1', date: '2026-01-01', event: '双方进行沟通。', actorIds: ['actor-1'], certainty: 'confirmed' }],
    conflicts: [{ id: 'conflict-1', title: '履行范围分歧', description: '双方对履行范围理解不同。', actorIds: ['actor-1'] }],
    decisionFactors: [{ id: 'factor-1', label: '材料完整性', description: '现有材料仍需核验。', impact: 'uncertain' }],
    risks: [{ id: 'risk-1', description: '部分信息尚未确认。', severity: 'medium', mitigation: '由律师补充核验。' }],
    unknowns: [{ id: 'unknown-1', question: '完整约定内容是什么？', importance: 'high' }],
    selfReview: { confidence: 0.7, limitations: ['材料尚不完整'], assumptions: ['仅基于当前输入'], requiresLawyerReview: true },
  }
}

describe('CaseModelSchema', () => {
  it('defines only the nine case cognition fields', () => {
    expect(CASE_MODEL_FIELDS).toEqual(['identity', 'narrative', 'actors', 'timeline', 'conflicts', 'decisionFactors', 'risks', 'unknowns', 'selfReview'])
    expect(CASE_MODEL_FORBIDDEN_FIELDS).toEqual(['facts', 'issues', 'laws', 'documents'])
    expect(Object.keys(validModel())).toEqual(CASE_MODEL_FIELDS)
  })

  it('validates a complete cognition model', () => {
    const model = validModel()
    expect(new CaseModelValidator().validate(model)).toEqual({ ok: true, issues: [] })
    expect(new CaseEvaluationService().evaluate(model)).toMatchObject({ status: 'ready', completeness: 100 })
  })

  it.each(['facts', 'issues', 'laws', 'documents'])('rejects forbidden business-layer field %s', (field) => {
    const model: any = validModel()
    model[field] = []
    expect(new CaseModelValidator().validate(model).issues).toContainEqual(expect.objectContaining({ path: field, code: 'cognition_boundary_violation' }))
  })

  it('rejects invalid self review confidence', () => {
    const model: any = validModel()
    model.selfReview.confidence = 2
    expect(new CaseModelValidator().validate(model).issues).toContainEqual(expect.objectContaining({ path: 'selfReview.confidence', code: 'confidence_invalid' }))
  })

  it('rejects invalid cognition enum values', () => {
    const model: any = validModel()
    model.timeline[0].certainty = 'certain'
    expect(new CaseModelValidator().validate(model).issues).toContainEqual(expect.objectContaining({ path: 'timeline[0].certainty', code: 'enum_invalid' }))
  })

  it('orchestrates an injected pipeline and exposes the prompt contract', async () => {
    const model = validModel()
    const result = await new CaseChiefService({ buildModel: async () => model }).buildCaseIntelligence({ case_id: 'case-1', title: '合同纠纷', context: {} })
    expect(result.model).toBe(model)
    expect(buildCaseIntelligencePrompt({ case_id: 'case-1', title: '合同纠纷', context: {} })).toMatchObject({ prompt_version: 'case-model-v1', task: 'build_case_model' })
  })
})
