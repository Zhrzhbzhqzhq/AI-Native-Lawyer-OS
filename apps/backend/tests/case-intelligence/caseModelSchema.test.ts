import { describe, expect, it } from 'vitest'
import { CASE_MODEL_FIELDS, CASE_MODEL_SCHEMA } from '../../src/services/case-intelligence/CaseModelSchema'
import CaseModelValidator from '../../src/services/case-intelligence/CaseModelValidator'
import { mockCaseModel } from './caseModel.fixture'

describe('CaseModel schema', () => {
  it('defines and validates every cognition layer field', () => {
    expect(CASE_MODEL_FIELDS).toEqual([
      'identity', 'narrative', 'actors', 'timeline', 'conflicts',
      'decisionFactors', 'risks', 'unknowns', 'selfReview',
    ])
    expect(CASE_MODEL_SCHEMA.required).toEqual(CASE_MODEL_FIELDS)
    expect(new CaseModelValidator().validate(mockCaseModel())).toEqual({ ok: true, issues: [] })
  })
})
