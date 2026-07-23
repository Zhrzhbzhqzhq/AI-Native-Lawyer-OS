import {
  CASE_MODEL_FIELDS,
  CASE_MODEL_FORBIDDEN_FIELDS,
  CASE_MODEL_SCHEMA,
} from './CaseModelSchema'
import type { CaseModelValidationIssue, CaseModelValidationResult } from './types/caseModel.types'
import AmountDerivationValidator from './AmountDerivationValidator'

export type CaseModelValidationOptions = {
  sourceText?: string
}

export type CaseContentInput = {
  case: string
  content: string
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function objectValue(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function validateStringFields(value: unknown, path: string, fields: readonly string[], issues: CaseModelValidationIssue[]) {
  if (!objectValue(value)) {
    issues.push({ path, code: 'object_required', message: `${path} must be an object.` })
    return
  }
  for (const field of fields) {
    if (!nonEmptyString(value[field])) issues.push({ path: `${path}.${field}`, code: 'required_string', message: `${field} must be a non-empty string.` })
  }
}

function validateCollection(value: unknown, path: string, fields: readonly string[], issues: CaseModelValidationIssue[]) {
  if (!Array.isArray(value)) {
    issues.push({ path, code: 'collection_required', message: `${path} must be an array.` })
    return
  }
  const ids = new Set<string>()
  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`
    validateStringFields(item, itemPath, fields.filter((field) => !['actorIds', 'certainty', 'impact', 'severity', 'importance'].includes(field)), issues)
    if (!objectValue(item)) return
    if (nonEmptyString(item.id)) {
      if (ids.has(item.id)) issues.push({ path: `${itemPath}.id`, code: 'duplicate_id', message: `Duplicate id ${item.id}.` })
      ids.add(item.id)
    }
    if (fields.includes('actorIds') && (!Array.isArray(item.actorIds) || !item.actorIds.every(nonEmptyString))) {
      issues.push({ path: `${itemPath}.actorIds`, code: 'string_array_required', message: 'actorIds must be a string array.' })
    }
  })
}

function validateEnumField(value: unknown, path: string, field: string, allowed: readonly string[], issues: CaseModelValidationIssue[]) {
  if (!Array.isArray(value)) return
  value.forEach((item, index) => {
    if (objectValue(item) && !allowed.includes(String(item[field] || ''))) {
      issues.push({ path: `${path}[${index}].${field}`, code: 'enum_invalid', message: `${field} must be one of ${allowed.join(', ')}.` })
    }
  })
}

const CROSS_CASE_CONTAMINATION_PATTERNS = [
  /上一案件/,
  /其他案件(?:的|中)/,
  /示例案件/,
  /跨案件污染/,
  /测试数据污染/,
]

const TOPIC_SIGNALS = [
  { name: 'renovation', caseTerms: ['装修', '装饰'], contentTerms: ['装修', '装饰', '施工', '工程', '返工'] },
  { name: 'lending', caseTerms: ['借款', '借贷'], contentTerms: ['借款', '借贷', '出借', '还款', '借条'] },
  { name: 'labor', caseTerms: ['劳动', '劳务'], contentTerms: ['劳动', '劳务', '工资', '工伤', '解除劳动'] },
] as const

function topicOf(text: string, key: 'caseTerms' | 'contentTerms') {
  return TOPIC_SIGNALS.filter((topic) => topic[key].some((term) => text.includes(term))).map((topic) => topic.name)
}

function amountsIn(value: unknown): string[] {
  return collectStrings(value).flatMap((text) => Array.from(text.matchAll(/\d[\d,]*(?:\.\d+)?\s*(?:元|万元|亿元)/g), (match) => match[0].replace(/\s|,/g, '')))
}

function amountInYuan(amount: string): number | null {
  const match = amount.match(/^(\d+(?:\.\d+)?)(元|万元|亿元)$/)
  if (!match) return null
  const multiplier = match[2] === '亿元' ? 100_000_000 : match[2] === '万元' ? 10_000 : 1
  return Number(match[1]) * multiplier
}

const CHINESE_DIGITS: Readonly<Record<string, number>> = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}

function countValue(value: string): number | null {
  if (/^\d+$/.test(value)) return Number(value)
  if (value === '十') return 10
  if (value.includes('十')) {
    const [tens, units] = value.split('十')
    const tensValue = tens ? CHINESE_DIGITS[tens] : 1
    const unitsValue = units ? CHINESE_DIGITS[units] : 0
    return tensValue === undefined || unitsValue === undefined ? null : tensValue * 10 + unitsValue
  }
  return CHINESE_DIGITS[value] ?? null
}

type AmountDerivation = {
  claimedAmount: string
  expectedYuan: number
}

function monthlyRentDerivations(model: unknown, sourceText: string): AmountDerivation[] {
  const monthlyRates = Array.from(
    sourceText.matchAll(/(?:每月租金|月租金|月租)(?:为|是|共计|合计)?\s*(\d[\d,]*(?:\.\d+)?\s*(?:元|万元|亿元))/g),
    (match) => amountInYuan(match[1].replace(/\s|,/g, '')),
  ).filter((rate): rate is number => rate !== null)
  if (monthlyRates.length === 0) return []

  return collectStrings(model).flatMap((text) => Array.from(
    text.matchAll(/([零一二两三四五六七八九十\d]+)个月(?:的)?租金(?:共|合计|总计|为|是)?\s*(\d[\d,]*(?:\.\d+)?\s*(?:元|万元|亿元))/g),
    (match): AmountDerivation | null => {
      const months = countValue(match[1])
      if (months === null) return null
      return {
        claimedAmount: match[2].replace(/\s|,/g, ''),
        expectedYuan: months * monthlyRates[0],
      }
    },
  ).filter((derivation): derivation is AmountDerivation => derivation !== null))
}

function amountIssue(amount: string, derivations: readonly AmountDerivation[]): CaseModelValidationIssue {
  const derivation = derivations.find((candidate) => candidate.claimedAmount === amount)
  if (!derivation) {
    return {
      path: '$',
      code: 'amount_unsupported',
      message: `Amount ${amount} has no explicit or derivable source support.`,
    }
  }
  const claimedYuan = amountInYuan(amount)
  if (claimedYuan !== derivation.expectedYuan) {
    return {
      path: '$',
      code: 'amount_derivation_mismatch',
      message: `Amount ${amount} does not match the derived amount ${derivation.expectedYuan}元.`,
    }
  }
  return {
    path: '$',
    code: 'amount_not_in_source',
    message: `Amount ${amount} is derivable but does not appear explicitly in source content.`,
  }
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectStrings)
  if (objectValue(value)) return Object.values(value).flatMap(collectStrings)
  return []
}

export class CaseModelValidator {
  private readonly amountDerivationValidator = new AmountDerivationValidator()

  validateCaseContent(input: CaseContentInput): CaseModelValidationResult {
    const issues: CaseModelValidationIssue[] = []
    if (!nonEmptyString(input?.case)) issues.push({ path: 'case', code: 'case_title_required', message: 'case must be a non-empty string.' })
    if (!nonEmptyString(input?.content)) issues.push({ path: 'content', code: 'case_content_required', message: 'content must be a non-empty string.' })
    if (issues.length > 0) return { ok: false, issues }
    const expectedTopics = topicOf(input.case, 'caseTerms')
    const contentTopics = topicOf(input.content, 'contentTerms')
    if (expectedTopics.length > 0 && contentTopics.length > 0 && !contentTopics.some((topic) => expectedTopics.includes(topic))) {
      issues.push({ path: 'content', code: 'topic_drift', message: 'Content topic does not match the declared case topic.' })
      issues.push({ path: 'content', code: 'cross_case_contamination', message: 'Content contains a strong signal from another case topic.' })
    }
    return { ok: issues.length === 0, issues }
  }

  validate(value: unknown, options: CaseModelValidationOptions = {}): CaseModelValidationResult {
    const issues: CaseModelValidationIssue[] = []
    if (!objectValue(value)) return { ok: false, issues: [{ path: '$', code: 'case_model_invalid', message: 'CaseModel must be an object.' }] }

    for (const field of CASE_MODEL_FORBIDDEN_FIELDS) {
      if (field in value) issues.push({ path: field, code: 'cognition_boundary_violation', message: `${field} is outside the CaseModel cognition layer.` })
    }
    for (const field of CASE_MODEL_FIELDS) {
      if (!(field in value)) issues.push({ path: field, code: 'field_required', message: `${field} is required.` })
    }
    for (const field of Object.keys(value)) {
      if (!(CASE_MODEL_FIELDS as readonly string[]).includes(field) && !(CASE_MODEL_FORBIDDEN_FIELDS as readonly string[]).includes(field)) {
        issues.push({ path: field, code: 'unexpected_field', message: `${field} is not part of CaseModel.` })
      }
    }

    validateStringFields(value.identity, 'identity', CASE_MODEL_SCHEMA.properties.identity, issues)
    validateStringFields(value.narrative, 'narrative', CASE_MODEL_SCHEMA.properties.narrative, issues)
    validateCollection(value.actors, 'actors', CASE_MODEL_SCHEMA.properties.actors, issues)
    validateCollection(value.timeline, 'timeline', CASE_MODEL_SCHEMA.properties.timeline, issues)
    validateCollection(value.conflicts, 'conflicts', CASE_MODEL_SCHEMA.properties.conflicts, issues)
    validateCollection(value.decisionFactors, 'decisionFactors', CASE_MODEL_SCHEMA.properties.decisionFactors, issues)
    validateCollection(value.risks, 'risks', CASE_MODEL_SCHEMA.properties.risks, issues)
    validateCollection(value.unknowns, 'unknowns', CASE_MODEL_SCHEMA.properties.unknowns, issues)
    validateEnumField(value.timeline, 'timeline', 'certainty', ['confirmed', 'disputed', 'unknown'], issues)
    validateEnumField(value.decisionFactors, 'decisionFactors', 'impact', ['supportive', 'adverse', 'neutral', 'uncertain'], issues)
    validateEnumField(value.risks, 'risks', 'severity', ['low', 'medium', 'high'], issues)
    validateEnumField(value.unknowns, 'unknowns', 'importance', ['low', 'medium', 'high'], issues)
    if (Array.isArray(value.actors) && value.actors.length === 0) {
      issues.push({ path: 'actors', code: 'case_actor_required', message: 'At least one case actor is required.' })
    }
    if (Array.isArray(value.actors)) {
      const actorIds = new Set(value.actors.filter(objectValue).map((actor) => String(actor.id || '')).filter(Boolean))
      const references = [
        ...(Array.isArray(value.timeline) ? value.timeline : []),
        ...(Array.isArray(value.conflicts) ? value.conflicts : []),
      ].filter(objectValue).flatMap((item) => Array.isArray(item.actorIds) ? item.actorIds : [])
      for (const actorId of references) {
        if (!actorIds.has(String(actorId))) issues.push({ path: 'actorIds', code: 'unknown_actor_reference', message: `Actor ${actorId} is not declared in actors.` })
      }
    }
    if (typeof options.sourceText === 'string') {
      const allowedAmounts = new Set(amountsIn(options.sourceText))
      const derivations = monthlyRentDerivations(value, options.sourceText)
      for (const amount of new Set(amountsIn(value))) {
        if (allowedAmounts.has(amount)) continue
        const expressionValidation = this.amountDerivationValidator.validate(
          amount,
          value,
          options.sourceText,
        )
        if (expressionValidation.status === 'valid') continue
        if (expressionValidation.status === 'mismatch') {
          issues.push({
            path: '$',
            code: 'amount_derivation_mismatch',
            message: `Amount ${amount} does not match the derived amount ${expressionValidation.expectedYuan}元.`,
          })
          continue
        }
        if (expressionValidation.status === 'unsupported') {
          issues.push({
            path: '$',
            code: 'amount_unsupported',
            message: `Amount ${amount} uses an ungrounded derivation expression.`,
          })
          continue
        }
        issues.push(amountIssue(amount, derivations))
      }
    }
    if (collectStrings(value).some((text) => CROSS_CASE_CONTAMINATION_PATTERNS.some((pattern) => pattern.test(text)))) {
      issues.push({ path: '$', code: 'cross_case_contamination', message: 'CaseModel contains an explicit cross-case contamination marker.' })
    }

    const selfReview = value.selfReview
    if (!objectValue(selfReview)) issues.push({ path: 'selfReview', code: 'object_required', message: 'selfReview must be an object.' })
    else {
      if (typeof selfReview.confidence !== 'number' || selfReview.confidence < 0 || selfReview.confidence > 1) {
        issues.push({ path: 'selfReview.confidence', code: 'confidence_invalid', message: 'confidence must be between 0 and 1.' })
      }
      for (const field of ['limitations', 'assumptions'] as const) {
        if (!Array.isArray(selfReview[field]) || !selfReview[field].every(nonEmptyString)) {
          issues.push({ path: `selfReview.${field}`, code: 'string_array_required', message: `${field} must be a string array.` })
        }
      }
      if (typeof selfReview.requiresLawyerReview !== 'boolean') {
        issues.push({ path: 'selfReview.requiresLawyerReview', code: 'boolean_required', message: 'requiresLawyerReview must be boolean.' })
      }
    }
    return { ok: issues.length === 0, issues }
  }
}

export default CaseModelValidator
