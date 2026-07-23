import { describe, expect, it } from 'vitest'
import CaseEvaluationService, { CASE_EVALUATION_WEIGHTS } from '../src/services/case-intelligence/CaseEvaluationService'
import type { CaseModel } from '../src/services/case-intelligence/types/caseModel.types'

function model(): CaseModel {
  return {
    identity: { caseId: 'case-1', title: '设备采购合同纠纷', caseType: '合同纠纷', stage: '诉前', jurisdiction: '中国大陆' },
    narrative: { summary: '双方对设备交付和付款存在争议。', background: '双方签订设备采购合同。', currentPosture: '正在核对履行材料。' },
    actors: [{ id: 'a-1', name: '甲公司', role: '供货方', position: '主张支付剩余价款。' }],
    timeline: [],
    conflicts: [{ id: 'c-1', title: '付款范围', description: '双方对剩余付款范围存在分歧。', actorIds: ['a-1'] }],
    decisionFactors: [{ id: 'f-1', label: '交付情况', description: '设备是否完成交付。', impact: 'supportive' }],
    risks: [{ id: 'r-1', description: '质量异议材料尚需核验。', severity: 'medium', mitigation: '补充核验异议材料。' }],
    unknowns: [{ id: 'u-1', question: '质量异议何时提出？', importance: 'high' }],
    selfReview: { confidence: 0.7, limitations: [], assumptions: [], requiresLawyerReview: true },
  }
}

describe('CaseEvaluationService.compare', () => {
  it('returns 100 for an identical CaseModel', () => {
    const result = new CaseEvaluationService().compare(model(), structuredClone(model()))
    expect(result.score).toBe(100)
    expect(result.topicDriftDetected).toBe(false)
    expect(Object.values(CASE_EVALUATION_WEIGHTS).reduce((total, weight) => total + weight, 0)).toBe(100)
  })

  it('scores each required dimension without an LLM', () => {
    const actual = model()
    actual.actors = []
    actual.risks = []
    actual.unknowns = []
    const result = new CaseEvaluationService().compare(actual, model())
    expect(result.score).toBeLessThan(100)
    expect(result.dimensions.actors.score).toBe(0)
    expect(result.dimensions.risks.score).toBe(0)
    expect(result.dimensions.unknowns.score).toBe(0)
  })

  it('detects strong topic drift deterministically', () => {
    const actual = model()
    actual.identity.title = '劳动关系解除争议'
    actual.identity.caseType = '劳动争议'
    actual.narrative = { summary: '员工对解除劳动关系提出异议。', background: '双方存在劳动关系。', currentPosture: '正在申请劳动仲裁。' }
    actual.actors = [{ id: 'a-2', name: '劳动者', role: '申请人', position: '要求恢复劳动关系。' }]
    actual.conflicts = [{ id: 'c-2', title: '解除合法性', description: '解除程序是否合法。', actorIds: ['a-2'] }]
    actual.decisionFactors = [{ id: 'f-2', label: '解除通知', description: '是否送达解除通知。', impact: 'uncertain' }]
    const result = new CaseEvaluationService().compare(actual, model())
    expect(result.topicDriftDetected).toBe(true)
    expect(result.dimensions.topicDrift.score).toBeLessThan(50)
  })

  it('treats case essence and performance-order expressions as highly related', () => {
    const golden = model()
    golden.identity.title = '股权转让合同履行争议'
    golden.identity.caseType = '股权转让合同关系'
    golden.narrative.summary = '受让方与转让方对股权转让合同履行发生争议。'
    golden.conflicts = [{ id: 'c-1', title: '付款是否影响交割', description: '剩余价款支付是否影响股权交割。', actorIds: ['a-1'] }]
    const actual = structuredClone(golden)
    actual.identity.title = '剩余价款与股权交割先后关系争议'
    actual.narrative.summary = '双方争议集中于付款与股权交割的履行顺序。'
    actual.conflicts = [{ id: 'c-2', title: '剩余价款与股权交割先后关系', description: '双方对付款和过户顺序存在分歧。', actorIds: ['a-1'] }]

    const result = new CaseEvaluationService().compare(actual, golden)
    expect(result.dimensions.identity.score).toBeGreaterThanOrEqual(75)
    expect(result.dimensions.conflicts.score).toBeGreaterThanOrEqual(80)
    expect(result.topicDriftDetected).toBe(false)
  })

  it('matches decision factors by legal concept instead of literal wording', () => {
    const golden = model()
    golden.decisionFactors = [{ id: 'f-1', label: '付款顺序', description: '剩余价款何时支付。', impact: 'uncertain' }]
    const actual = structuredClone(golden)
    actual.decisionFactors = [{ id: 'f-2', label: '对价履行次序', description: '尾款支付是否以交割为前提。', impact: 'uncertain' }]

    expect(new CaseEvaluationService().compare(actual, golden).dimensions.decisionFactors.score)
      .toBeGreaterThanOrEqual(75)
  })

  it('does not treat normal legal concept expansion as topic contamination', () => {
    const golden = model()
    golden.identity.title = '股权转让合同纠纷'
    golden.identity.caseType = '股权转让合同关系'
    golden.narrative.summary = '双方就股权转让发生争议。'
    const actual = structuredClone(golden)
    actual.narrative.summary = '双方需要判断价款支付、股权交割条件和合同履行顺序。'
    actual.conflicts = [{ id: 'c-2', title: '付款与交割顺序', description: '付款是否影响交割。', actorIds: ['a-1'] }]

    const result = new CaseEvaluationService().compare(actual, golden)
    expect(result.topicDriftDetected).toBe(false)
    expect(result.dimensions.topicDrift.score).toBeGreaterThanOrEqual(60)
  })

  it('normalizes substantive and procedural actor roles', () => {
    const golden = model()
    golden.actors = [{ id: 'a-1', name: '陈伟', role: '受让方', position: '要求完成股权交割。' }]
    const actual = structuredClone(golden)
    actual.actors = [{ id: 'a-2', name: '陈伟', role: '受让方、原告', position: '主张办理目标股权交割。' }]

    expect(new CaseEvaluationService().compare(actual, golden).dimensions.actors.score)
      .toBeGreaterThanOrEqual(90)
  })

  it('matches risks by risk theme rather than literal wording', () => {
    const golden = model()
    golden.risks = [{ id: 'r-1', description: '付款顺序不明确。', severity: 'high', mitigation: '核对合同。' }]
    const actual = structuredClone(golden)
    actual.risks = [{ id: 'r-2', description: '履行顺序条款需要审查。', severity: 'medium', mitigation: '审查完整协议条款。' }]

    expect(new CaseEvaluationService().compare(actual, golden).dimensions.risks.score)
      .toBeGreaterThanOrEqual(75)
  })

  it('matches unknowns by confirmation concept', () => {
    const golden = model()
    golden.unknowns = [{ id: 'u-1', question: '合同付款顺序如何约定？', importance: 'high' }]
    const actual = structuredClone(golden)
    actual.unknowns = [{ id: 'u-2', question: '剩余价款支付与交割先后条款是什么？', importance: 'medium' }]

    expect(new CaseEvaluationService().compare(actual, golden).dimensions.unknowns.score)
      .toBeGreaterThanOrEqual(80)
  })

  it('exposes identity scores for business relationship, legal relationship and core nature', () => {
    const result = new CaseEvaluationService().compare(model(), structuredClone(model()))
    expect(result.dimensions.identity.components).toEqual({
      businessRelationship: 100,
      legalRelationship: 100,
      coreNature: 100,
    })
  })
})
