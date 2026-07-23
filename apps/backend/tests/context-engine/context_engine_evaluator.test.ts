import { describe, expect, it } from 'vitest'
import type { CaseModel } from '../../src/services/case-intelligence/types/caseModel.types'
import {
  caseModelToComparable,
  compareContextEngine,
  evaluateCaseUnderstanding,
} from '../../src/services/context_engine/context_engine_evaluator'

function golden(): CaseModel {
  return {
    identity: { caseId: 'case-1', title: '甲乙租赁纠纷', caseType: '房屋租赁合同纠纷', stage: '诉前', jurisdiction: '待确认' },
    narrative: { summary: '甲向乙出租房屋，双方因维修发生争议。', background: '双方签订房屋租赁合同。', currentPosture: '双方正在协商。' },
    actors: [
      { id: 'a1', name: '甲', role: '出租人', position: '认为已经维修' },
      { id: 'a2', name: '乙', role: '承租人', position: '认为维修未完成' },
    ],
    timeline: [{ id: 't1', date: '2026-01-01', event: '双方签订租赁合同', actorIds: ['a1', 'a2'], certainty: 'confirmed' }],
    conflicts: [{ id: 'c1', title: '维修是否完成', description: '双方对维修完成情况存在分歧', actorIds: ['a1', 'a2'] }],
    decisionFactors: [],
    risks: [],
    unknowns: [{ id: 'u1', question: '维修是否已经完成？', importance: 'high' }],
    selfReview: { confidence: 0.8, limitations: [], assumptions: [], requiresLawyerReview: true },
  }
}

describe('ContextEngineEvaluator', () => {
  it('gives identical grounded understanding full recovery', () => {
    const model = golden()
    const comparable = caseModelToComparable(model)
    const comparison = compareContextEngine(comparable, comparable, model, JSON.stringify(model))

    expect(comparison.delta).toBe(0)
    expect(comparison.recovered).toBe(true)
    expect(comparison.baseline.caseIdentity.caseType.score).toBe(100)
    expect(comparison.contextEngine.actors.score).toBe(100)
    expect(comparison.contextEngine.hallucination.score).toBe(100)
  })

  it('reports explicit amounts that do not exist in source materials', () => {
    const model = golden()
    const actual = caseModelToComparable(model)
    actual.narrative = { ...actual.narrative, summary: `${actual.narrative.summary} 涉案金额70万元。` }

    const evaluation = evaluateCaseUnderstanding(actual, model, '材料只记载双方签订租赁合同。')

    expect(evaluation.hallucination.unsupportedAmounts).toContain('70万元')
    expect(evaluation.hallucination.score).toBeLessThan(100)
  })

  it('treats Chinese and ISO forms of the same source date as grounded', () => {
    const model = golden()
    const actual = caseModelToComparable(model)

    const evaluation = evaluateCaseUnderstanding(actual, model, '材料记载双方于2026年1月1日签订合同。')

    expect(evaluation.hallucination.unsupportedDates).toEqual([])
  })

  it('treats relationship and dispute suffixes as the same legal relationship', () => {
    const model = golden()
    model.identity.caseType = '股权转让合同关系'
    const actual = caseModelToComparable(model)
    actual.caseIdentity = { ...actual.caseIdentity, caseType: '股权转让合同纠纷' }

    const evaluation = evaluateCaseUnderstanding(actual, model, JSON.stringify(actual))

    expect(evaluation.caseIdentity.caseType.score).toBe(100)
  })
})
