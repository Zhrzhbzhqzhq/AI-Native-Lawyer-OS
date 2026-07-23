import { describe, expect, it } from 'vitest'
import InitialUnderstandingNormalizer from '../../src/services/case-intelligence/hybrid/InitialUnderstandingNormalizer'

describe('InitialUnderstandingNormalizer', () => {
  it('converts string collection fields to string arrays', () => {
    const normalized = new InitialUnderstandingNormalizer().normalize({
      caseNature: '合同纠纷',
      summary: '双方对合同履行存在争议。',
      importantFacts: '已签订合同',
      possibleConflicts: '付款义务存在争议',
      uncertainties: '付款期限是否届满？',
    })

    expect(normalized).toEqual({
      caseNature: '合同纠纷',
      summary: '双方对合同履行存在争议。',
      importantFacts: ['已签订合同'],
      possibleConflicts: ['付款义务存在争议'],
      uncertainties: ['付款期限是否届满？'],
    })
  })

  it('repairs missing fields with safe defaults', () => {
    expect(new InitialUnderstandingNormalizer().normalize({})).toEqual({
      caseNature: 'unknown',
      summary: '',
      importantFacts: [],
      possibleConflicts: [],
      uncertainties: [],
    })
  })

  it('normalizes empty scalar fields and filters invalid array entries', () => {
    const normalized = new InitialUnderstandingNormalizer().normalize({
      caseNature: '   ',
      summary: null,
      importantFacts: ['事实一', null, 2],
      possibleConflicts: undefined,
      uncertainties: ['问题一'],
      additionalField: 'ignored',
    })

    expect(normalized).toEqual({
      caseNature: 'unknown',
      summary: '',
      importantFacts: ['事实一'],
      possibleConflicts: [],
      uncertainties: ['问题一'],
    })
  })
})
