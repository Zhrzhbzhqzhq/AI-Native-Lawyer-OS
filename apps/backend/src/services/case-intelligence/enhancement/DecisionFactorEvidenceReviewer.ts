import ProviderManager from '../../../ai/providerManager'
import { parseAIJson } from '../../ai/parseAIJson'
import type {
  CaseIntelligenceInput,
  CaseModel,
} from '../types/caseModel.types'
import type {
  DecisionFactorGroundingReviewInput,
  DecisionFactorGroundingWarning,
} from './DecisionFactorGroundingNormalizer'

type Generator = { generate(promptPack: any): Promise<any> }

export type DecisionFactorSupportStatus = 'supported' | 'unsupported' | 'missing_evidence'

export type DecisionFactorEvidenceReview = {
  decisionFactorId: string
  supportStatus: DecisionFactorSupportStatus
  sourceRefs: string[]
  notes: string
}

export type DecisionFactorEvidenceReviewerOptions = {
  onResponse?: (response: unknown) => void
  groundingNormalizer?: {
    normalize(
      decisionFactors: readonly CaseModel['decisionFactors'][number][],
      review: readonly DecisionFactorGroundingReviewInput[],
      availableSourceRefs: readonly string[],
    ): {
      normalizedReview: DecisionFactorEvidenceReview[]
      warnings: DecisionFactorGroundingWarning[]
    }
  }
}

const SUPPORT_STATUSES: readonly DecisionFactorSupportStatus[] = [
  'supported',
  'unsupported',
  'missing_evidence',
]

const PROHIBITED_JUDGMENT_PATTERNS = [
  /胜诉/,
  /败诉/,
  /法院将/,
  /应当判决/,
  /必然承担/,
  /最终法律结论/,
]

function responseBody(response: any): any {
  return response?.response !== undefined ? response.response : response
}

function extractJson(response: any): unknown {
  const layers: any[] = []
  let current = response
  const seen = new Set<any>()
  while (current !== undefined && current !== null && !seen.has(current)) {
    layers.push(current)
    seen.add(current)
    if (!current || typeof current !== 'object' || Array.isArray(current)
      || current.response === undefined) break
    current = current.response
  }
  for (const layer of layers) {
    const content = layer?.choices?.[0]?.message?.content
      ?? layer?.data?.choices?.[0]?.message?.content
    if (typeof content === 'string') return parseAIJson(content).data
  }
  const body = responseBody(response)
  return typeof body === 'string' ? parseAIJson(body).data : body
}

function collectInputIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectInputIds)
  if (!value || typeof value !== 'object') return []
  const object = value as Record<string, unknown>
  return [
    ...(typeof object.id === 'string' && /^(?:material|evidence|fact)-/.test(object.id)
      ? [object.id]
      : []),
    ...Object.values(object).flatMap(collectInputIds),
  ]
}

function reviewsFrom(value: unknown): unknown {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return (value as Record<string, unknown>).reviews
  }
  return value
}

function parseReviewInputs(value: unknown): DecisionFactorGroundingReviewInput[] {
  if (!Array.isArray(value)) throw new Error('decision_factor_evidence_review_invalid')
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('decision_factor_evidence_review_invalid')
    }
    const review = item as Record<string, unknown>
    if (typeof review.decisionFactorId !== 'string'
      || !SUPPORT_STATUSES.includes(review.supportStatus as DecisionFactorSupportStatus)
      || typeof review.notes !== 'string') {
      throw new Error('decision_factor_evidence_review_invalid')
    }
    return review as DecisionFactorGroundingReviewInput
  })
}

function strictReviewsFrom(inputs: DecisionFactorGroundingReviewInput[]): DecisionFactorEvidenceReview[] {
  if (inputs.some((review) => !Array.isArray(review.sourceRefs)
    || !review.sourceRefs.every((source) => typeof source === 'string'))) {
    throw new Error('decision_factor_evidence_review_invalid')
  }
  return inputs as DecisionFactorEvidenceReview[]
}

function availableSourceRefs(
  input: CaseIntelligenceInput,
  baseCaseModel: CaseModel,
  enhancedV2CaseModel: CaseModel,
): string[] {
  return [
    ...collectInputIds(input.context),
    ...baseCaseModel.timeline.map((entry) => entry.id),
    ...enhancedV2CaseModel.timeline.map((entry) => entry.id),
  ]
}

function validateReviews(
  reviews: DecisionFactorEvidenceReview[],
  input: CaseIntelligenceInput,
  baseCaseModel: CaseModel,
  enhancedV2CaseModel: CaseModel,
): void {
  const factorIds = enhancedV2CaseModel.decisionFactors.map((factor) => factor.id)
  const reviewIds = reviews.map((review) => review.decisionFactorId)
  if (new Set(reviewIds).size !== reviewIds.length
    || reviews.length !== factorIds.length
    || factorIds.some((id) => !reviewIds.includes(id))) {
    throw new Error('decision_factor_evidence_review_incomplete')
  }

  const sourceIds = new Set(availableSourceRefs(input, baseCaseModel, enhancedV2CaseModel))
  for (const review of reviews) {
    if (review.sourceRefs.some((sourceRef) => !sourceIds.has(sourceRef))) {
      throw new Error(`decision_factor_evidence_source_invalid:${review.decisionFactorId}`)
    }
    if (review.supportStatus === 'supported' && review.sourceRefs.length === 0) {
      throw new Error(`decision_factor_evidence_source_required:${review.decisionFactorId}`)
    }
    if (PROHIBITED_JUDGMENT_PATTERNS.some((pattern) => pattern.test(review.notes))) {
      throw new Error(`decision_factor_evidence_legal_judgment_forbidden:${review.decisionFactorId}`)
    }
  }
}

function prompt(
  input: CaseIntelligenceInput,
  baseCaseModel: CaseModel,
  enhancedV2CaseModel: CaseModel,
): string {
  return [
    '你是 LawDesk Decision Factor Evidence Review Prototype。',
    '只审核 ENHANCED_V2_CASE_MODEL 中已有的 decisionFactors，不得修改、删除或新增 decisionFactor。',
    '不得生成新的法律判断，不得预测裁判结果，不得增加材料外事实。',
    '每个 decisionFactor 必须输出且只能输出一条 review。',
    'supportStatus 只能是 supported、unsupported、missing_evidence。',
    'sourceRefs 只能引用 CASE_INPUT 中已有 material/evidence/fact id，或 CaseModel 中已有 timeline id。',
    '只输出 JSON 数组，每项严格包含 decisionFactorId、supportStatus、sourceRefs、notes。',
    `CASE_INPUT:\n${JSON.stringify(input)}`,
    `BASE_CASE_MODEL:\n${JSON.stringify(baseCaseModel)}`,
    `ENHANCED_V2_CASE_MODEL:\n${JSON.stringify(enhancedV2CaseModel)}`,
  ].join('\n\n')
}

export class DecisionFactorEvidenceReviewer {
  private lastGroundingWarnings: DecisionFactorGroundingWarning[] = []

  constructor(
    private readonly generator?: Generator,
    private readonly options: DecisionFactorEvidenceReviewerOptions = {},
  ) {}

  async review(
    input: CaseIntelligenceInput,
    baseCaseModel: CaseModel,
    enhancedV2CaseModel: CaseModel,
  ): Promise<DecisionFactorEvidenceReview[]> {
    this.lastGroundingWarnings = []
    const generator = this.generator || ProviderManager.getAdapter()
    const model = process.env.MINIMAX_MODEL || process.env.AI_MODEL || 'MiniMax-M3'
    const rawResponse = await generator.generate({
      provider: 'minimax',
      model,
      prompt_version: 'case-intelligence-decision-factor-evidence-review-v1',
      task: 'case_intelligence_decision_factor_evidence_review',
      matter_id: input.case_id,
      max_completion_tokens: 3000,
      system_prompt: '仅输出 Decision Factor evidence review JSON 数组。',
      user_prompt: prompt(input, baseCaseModel, enhancedV2CaseModel),
    })
    this.options.onResponse?.(rawResponse)

    try {
      const reviewInputs = parseReviewInputs(reviewsFrom(extractJson(rawResponse)))
      const reviews = this.options.groundingNormalizer
        ? this.normalizeGrounding(reviewInputs, input, baseCaseModel, enhancedV2CaseModel)
        : strictReviewsFrom(reviewInputs)
      validateReviews(reviews, input, baseCaseModel, enhancedV2CaseModel)
      return reviews
    } catch (caught) {
      const error = caught instanceof Error ? caught : new Error(String(caught))
      ;(error as any).failingStage = 'decision_factor_evidence_review'
      ;(error as any).rawAIResponse = rawResponse
      ;(error as any).provider = 'minimax'
      ;(error as any).model = model
      throw error
    }
  }

  groundingWarnings(): readonly DecisionFactorGroundingWarning[] {
    return this.lastGroundingWarnings
  }

  private normalizeGrounding(
    review: DecisionFactorGroundingReviewInput[],
    input: CaseIntelligenceInput,
    baseCaseModel: CaseModel,
    enhancedV2CaseModel: CaseModel,
  ): DecisionFactorEvidenceReview[] {
    const result = this.options.groundingNormalizer!.normalize(
      enhancedV2CaseModel.decisionFactors,
      review,
      availableSourceRefs(input, baseCaseModel, enhancedV2CaseModel),
    )
    this.lastGroundingWarnings = result.warnings
    return result.normalizedReview
  }
}

export default DecisionFactorEvidenceReviewer
