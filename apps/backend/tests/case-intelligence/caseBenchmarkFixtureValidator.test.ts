import { describe, expect, it } from 'vitest'
import {
  assertCaseBenchmarkFixtureBoundary,
  validateCaseBenchmarkFixture,
} from '../../src/services/case-intelligence/CaseBenchmarkFixtureValidator'

describe('Case Benchmark Fixture Boundary Validator', () => {
  it('accepts case-006 when all required keywords exist and forbidden keywords are absent', () => {
    expect(validateCaseBenchmarkFixture('case-006', {
      title: '股权转让合同纠纷',
      conflict: '付款与交割顺序',
    })).toEqual({ ok: true, missingRequired: [], forbiddenMatches: [] })
  })

  it('returns fixture_contamination when a required keyword is missing', () => {
    expect(() => assertCaseBenchmarkFixtureBoundary('case-006', {
      title: '股权转让合同纠纷',
    })).toThrowError('fixture_contamination')
    try {
      assertCaseBenchmarkFixtureBoundary('case-006', { title: '股权转让合同纠纷' })
    } catch (error) {
      expect(error).toMatchObject({
        code: 'fixture_contamination',
        validation: { missingRequired: ['交割'], forbiddenMatches: [] },
      })
    }
  })

  it.each(['劳动', '工资', '员工', '解除'])('rejects case-006 forbidden keyword: %s', (keyword) => {
    expect(() => assertCaseBenchmarkFixtureBoundary('case-006', {
      title: '股权转让及交割争议',
      contamination: keyword,
    })).toThrowError('fixture_contamination')
  })
})
