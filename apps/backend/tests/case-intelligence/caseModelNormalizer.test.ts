import { describe, expect, it } from 'vitest'
import { normalizeCaseModel } from '../../src/services/case-intelligence/CaseModelNormalizer'
import { mockCaseModel } from './caseModel.fixture'

describe('CaseModelNormalizer', () => {
  it('normalizes Chinese CaseModel enum values', () => {
    const model: any = mockCaseModel()
    model.timeline = [
      { ...model.timeline[0], certainty: '确定' },
      { ...model.timeline[0], id: 'time-2', certainty: '已确认' },
      { ...model.timeline[0], id: 'time-3', certainty: '存在争议' },
      { ...model.timeline[0], id: 'time-4', certainty: '未知' },
    ]
    model.decisionFactors = [
      { ...model.decisionFactors[0], impact: '有利' },
      { ...model.decisionFactors[0], id: 'factor-2', impact: '不利' },
      { ...model.decisionFactors[0], id: 'factor-3', impact: '重要' },
      { ...model.decisionFactors[0], id: 'factor-4', impact: '不确定' },
    ]
    model.risks[0].severity = '高'
    model.unknowns[0].importance = '中'

    const normalized: any = normalizeCaseModel(model)
    expect(normalized.timeline.map((item: any) => item.certainty))
      .toEqual(['confirmed', 'confirmed', 'disputed', 'unknown'])
    expect(normalized.decisionFactors.map((item: any) => item.impact))
      .toEqual(['supportive', 'adverse', 'uncertain', 'uncertain'])
    expect(normalized.risks[0].severity).toBe('high')
    expect(normalized.unknowns[0].importance).toBe('medium')
  })

  it('normalizes the Direct MiniMax validation-boundary values', () => {
    const normalized: any = normalizeCaseModel({
      timeline: [{ certainty: '确定' }],
      decisionFactors: [{ impact: '重要' }],
      selfReview: { confidence: 72 },
    })

    expect(normalized).toMatchObject({
      timeline: [{ certainty: 'confirmed' }],
      decisionFactors: [{ impact: 'uncertain' }],
      selfReview: { confidence: 0.72 },
    })
  })

  it('normalizes real Direct MiniMax certainty, impact and percentage confidence output', () => {
    const normalized: any = normalizeCaseModel({
      timeline: [{ certainty: 'certain' }],
      decisionFactors: [{ impact: 'high' }],
      selfReview: { confidence: '72%' },
    })

    expect(normalized).toMatchObject({
      timeline: [{ certainty: 'confirmed' }],
      decisionFactors: [{ impact: 'uncertain' }],
      selfReview: { confidence: 0.72 },
    })
  })

  it.each([
    ['high', 0.9],
    ['medium', 0.5],
    ['low', 0.2],
    ['高', 0.9],
    ['中', 0.5],
    ['低', 0.2],
  ])('normalizes confidence level %s', (confidence, expected) => {
    const normalized: any = normalizeCaseModel({ selfReview: { confidence } })
    expect(normalized.selfReview.confidence).toBe(expected)
  })

  it('normalizes natural certainty and non-directional impact expressions', () => {
    const normalized: any = normalizeCaseModel({
      timeline: [
        { certainty: '高' },
        { certainty: '相关事实已经证实' },
      ],
      decisionFactors: [
        { impact: 'medium' },
        { impact: '直接决定双方履行义务的先后次序' },
        { impact: '影响案件走向和责任分配' },
      ],
    })

    expect(normalized.timeline.map((item: any) => item.certainty))
      .toEqual(['confirmed', 'confirmed'])
    expect(normalized.decisionFactors.map((item: any) => item.impact))
      .toEqual(['uncertain', 'uncertain', 'uncertain'])
  })

  it('normalizes confidence percentages and self-review string arrays', () => {
    const model: any = mockCaseModel()
    model.selfReview = {
      ...model.selfReview,
      confidence: 72,
      limitations: '材料尚不完整',
      assumptions: [1, '仅基于当前材料', ''],
    }

    const normalized: any = normalizeCaseModel(model)
    expect(normalized.selfReview).toMatchObject({
      confidence: 0.72,
      limitations: ['材料尚不完整'],
      assumptions: ['1', '仅基于当前材料'],
    })
  })

  it('does not mutate the raw Direct MiniMax output', () => {
    const model: any = mockCaseModel()
    model.timeline[0].certainty = '确定'
    normalizeCaseModel(model)
    expect(model.timeline[0].certainty).toBe('确定')
  })
})
