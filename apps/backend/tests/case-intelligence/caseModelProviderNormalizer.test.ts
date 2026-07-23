import { describe, expect, it } from 'vitest'
import CaseModelProviderNormalizer from '../../src/services/case-intelligence/CaseModelProviderNormalizer'
import { mockCaseModel } from './caseModel.fixture'

describe('CaseModelProviderNormalizer', () => {
  it.each(['', null, undefined])(
    'normalizes a missing jurisdiction value (%s)',
    (jurisdiction) => {
      const model = mockCaseModel() as any
      model.identity.jurisdiction = jurisdiction

      const normalized = new CaseModelProviderNormalizer().normalize(model)

      expect(normalized.identity.jurisdiction).toBe('unknown')
      expect(normalized.narrative).toBe(model.narrative)
      expect(normalized.actors).toBe(model.actors)
    },
  )

  it('keeps a normal jurisdiction and the complete model unchanged', () => {
    const model = mockCaseModel()

    const normalized = new CaseModelProviderNormalizer().normalize(model)

    expect(normalized).toBe(model)
    expect(normalized.identity.jurisdiction).toBe(model.identity.jurisdiction)
  })

  it('repairs missing required identity strings without changing caseId', () => {
    const model = mockCaseModel() as any
    const originalCaseId = model.identity.caseId
    model.identity.title = null
    model.identity.caseType = undefined
    model.identity.stage = ''
    model.identity.jurisdiction = '   '

    const normalized = new CaseModelProviderNormalizer().normalize(model)

    expect(normalized.identity).toEqual({
      caseId: originalCaseId,
      title: 'unknown',
      caseType: 'unknown',
      stage: 'unknown',
      jurisdiction: 'unknown',
    })
    expect(normalized.narrative).toBe(model.narrative)
  })

  it('repairs missing required narrative strings and preserves normal values', () => {
    const model = mockCaseModel() as any
    const originalSummary = model.narrative.summary
    model.narrative.background = null
    model.narrative.currentPosture = undefined

    const normalized = new CaseModelProviderNormalizer().normalize(model)

    expect(normalized.narrative).toEqual({
      summary: originalSummary,
      background: 'unknown',
      currentPosture: 'unknown',
    })
    expect(normalized.identity).toBe(model.identity)
  })

  it.each([
    ['identity.title', 'identity', 'title'],
    ['identity.caseType', 'identity', 'caseType'],
    ['identity.stage', 'identity', 'stage'],
    ['identity.jurisdiction', 'identity', 'jurisdiction'],
    ['narrative.summary', 'narrative', 'summary'],
    ['narrative.background', 'narrative', 'background'],
    ['narrative.currentPosture', 'narrative', 'currentPosture'],
  ])('normalizes an empty required string at %s', (_path, section, field) => {
    const model = mockCaseModel() as any
    model[section][field] = '   '

    const normalized = new CaseModelProviderNormalizer().normalize(model) as any

    expect(normalized[section][field]).toBe('unknown')
  })

  it.each([null, undefined, '', '   '])(
    'normalizes a missing timeline date (%s)',
    (date) => {
      const model = mockCaseModel() as any
      model.timeline[0].date = date

      const normalized = new CaseModelProviderNormalizer().normalize(model)

      expect(normalized.timeline[0].date).toBe('unknown')
    },
  )

  it.each([
    ['确定', 'confirmed'],
    ['certain', 'confirmed'],
    ['已确认', 'confirmed'],
    ['存在争议', 'disputed'],
    ['未知', 'unknown'],
    ['待确认', 'unknown'],
  ])('normalizes timeline certainty %s to %s', (certainty, expected) => {
    const model = mockCaseModel() as any
    model.timeline[0].certainty = certainty

    const normalized = new CaseModelProviderNormalizer().normalize(model)

    expect(normalized.timeline[0].certainty).toBe(expected)
  })

  it.each([
    [0.75, 0.75],
    [75, 0.75],
    ['75%', 0.75],
    ['高', 0.9],
    ['中', 0.5],
    ['低', 0.2],
  ])('normalizes self-review confidence %s to %s', (confidence, expected) => {
    const model = mockCaseModel() as any
    model.selfReview.confidence = confidence

    const normalized = new CaseModelProviderNormalizer().normalize(model)

    expect(normalized.selfReview.confidence).toBe(expected)
  })

  it.each([
    ['supportive', 'supportive'],
    ['adverse', 'adverse'],
    ['neutral', 'neutral'],
    ['重要', 'uncertain'],
    [null, 'uncertain'],
  ])('normalizes decision factor impact %s to %s', (impact, expected) => {
    const model = mockCaseModel() as any
    model.decisionFactors[0].impact = impact

    const normalized = new CaseModelProviderNormalizer().normalize(model)

    expect(normalized.decisionFactors[0].impact).toBe(expected)
  })

  it.each([
    ['高', 'high'],
    ['中', 'medium'],
    ['低', 'low'],
  ])('normalizes risk severity %s to %s', (severity, expected) => {
    const model = mockCaseModel() as any
    model.risks[0].severity = severity

    const normalized = new CaseModelProviderNormalizer().normalize(model)

    expect(normalized.risks[0].severity).toBe(expected)
  })

  it('does not mutate the Provider output', () => {
    const model = mockCaseModel() as any
    model.timeline[0].certainty = '确定'
    model.risks[0].severity = '高'
    model.identity.title = null
    model.narrative.background = ''

    new CaseModelProviderNormalizer().normalize(model)

    expect(model.timeline[0].certainty).toBe('确定')
    expect(model.risks[0].severity).toBe('高')
    expect(model.identity.title).toBeNull()
    expect(model.narrative.background).toBe('')
  })
})
