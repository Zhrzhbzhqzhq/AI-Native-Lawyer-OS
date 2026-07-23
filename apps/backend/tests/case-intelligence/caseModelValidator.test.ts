import { describe, expect, it } from 'vitest'
import CaseModelValidator from '../../src/services/case-intelligence/CaseModelValidator'
import { mockCaseModel } from './caseModel.fixture'

describe('CaseModelValidator', () => {
  it('detects topic drift and contamination in the requested case/content input', () => {
    const result = new CaseModelValidator().validateCaseContent({
      case: '装修合同纠纷',
      content: '张三向李四借款50000元',
    })
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(['topic_drift', 'cross_case_contamination']))
  })

  it('detects an empty case actor collection', () => {
    const model = mockCaseModel()
    model.actors = []
    expect(new CaseModelValidator().validate(model).issues).toContainEqual(expect.objectContaining({
      path: 'actors', code: 'case_actor_required',
    }))
  })

  it('detects a forbidden business-layer field', () => {
    const model: any = mockCaseModel()
    model.facts = []
    expect(new CaseModelValidator().validate(model).issues).toContainEqual(expect.objectContaining({
      path: 'facts', code: 'cognition_boundary_violation',
    }))
  })

  it('detects an unknown actor reference', () => {
    const model = mockCaseModel()
    model.timeline[0].actorIds = ['actor-not-declared']
    expect(new CaseModelValidator().validate(model).issues).toContainEqual(expect.objectContaining({
      code: 'unknown_actor_reference',
    }))
  })

  it('keeps an amount that appears explicitly in source content', () => {
    const model = mockCaseModel()
    model.narrative.summary = '合同月租金为6000元。'
    const result = new CaseModelValidator().validate(model, {
      sourceText: '双方约定月租金6000元。',
    })

    expect(result.issues.map((issue) => issue.code)).not.toEqual(expect.arrayContaining([
      'amount_not_in_source',
      'amount_derivation_mismatch',
      'amount_unsupported',
    ]))
  })

  it('keeps the existing failure rule for a correctly derived amount not explicit in source', () => {
    const model = mockCaseModel()
    model.narrative.summary = '六个月租金共36000元。'
    expect(new CaseModelValidator().validate(model, {
      sourceText: '合同约定月租金6000元。',
    }).issues).toContainEqual(expect.objectContaining({
      code: 'amount_not_in_source',
    }))
  })

  it('distinguishes a monthly-rent derivation mismatch', () => {
    const model = mockCaseModel()
    model.narrative.summary = '六个月租金共30000元。'
    expect(new CaseModelValidator().validate(model, {
      sourceText: '合同约定月租金6000元，首期三个月租金18000元，第二期三个月租金18000元。',
    }).issues).toContainEqual(expect.objectContaining({
      code: 'amount_derivation_mismatch',
      message: expect.stringContaining('36000元'),
    }))
  })

  it('detects an explicit addition formula mismatch', () => {
    const model = mockCaseModel()
    model.narrative.summary = '六个月租金写为30000元，计算依据为18000+18000。'
    const result = new CaseModelValidator().validate(model, {
      sourceText: '首期三个月租金18000元，第二期三个月租金18000元。',
    })

    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'amount_derivation_mismatch',
      message: expect.stringContaining('36000元'),
    }))
  })

  it.each([
    ['addition', '两期租金合计36000元（18000元+18000元）。', '两期租金分别为18000元和18000元。'],
    ['subtraction', '扣除后金额为12000元（18000元-6000元）。', '原金额18000元，扣除金额6000元。'],
    ['multiplication', '两个月租金为12000元（6000元×2）。', '合同约定月租金6000元。'],
    ['division and multiplication', '六日租金为1200元（6000元÷30×6）。', '合同约定月租金6000元。'],
  ])('allows a correctly derived amount using %s', (_name, summary, sourceText) => {
    const model = mockCaseModel()
    model.narrative.summary = summary
    const result = new CaseModelValidator().validate(model, { sourceText })

    expect(result.issues.map((issue) => issue.code)).not.toEqual(expect.arrayContaining([
      'amount_not_in_source',
      'amount_derivation_mismatch',
      'amount_unsupported',
    ]))
  })

  it('rejects a formula whose monetary operand is absent from source', () => {
    const model = mockCaseModel()
    model.narrative.summary = '六日租金为1200元（9000元÷30×4）。'
    const result = new CaseModelValidator().validate(model, {
      sourceText: '合同约定月租金6000元。',
    })

    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'amount_unsupported',
    }))
  })

  it('distinguishes an unsupported amount', () => {
    const model = mockCaseModel()
    model.narrative.summary = '双方争议金额为50000元。'
    expect(new CaseModelValidator().validate(model, { sourceText: '材料仅记载双方签订装修合同。' }).issues).toContainEqual(expect.objectContaining({
      code: 'amount_unsupported',
    }))
  })

  it('detects an explicit cross-case contamination marker', () => {
    const model = mockCaseModel()
    model.narrative.summary = '该内容来自上一案件，不属于当前输入。'
    expect(new CaseModelValidator().validate(model).issues).toContainEqual(expect.objectContaining({
      path: '$', code: 'cross_case_contamination',
    }))
  })
})
