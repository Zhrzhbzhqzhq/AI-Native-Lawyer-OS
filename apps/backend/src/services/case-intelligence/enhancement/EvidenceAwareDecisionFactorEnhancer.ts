import ProviderManager from '../../../ai/providerManager'
import { parseAIJson } from '../../ai/parseAIJson'
import CaseModelValidator from '../CaseModelValidator'
import type {
  CaseIntelligenceInput,
  CaseModel,
} from '../types/caseModel.types'

type Generator = { generate(promptPack: any): Promise<any> }
type DecisionFactor = CaseModel['decisionFactors'][number]

export type DecisionFactorGrounding = {
  decisionFactorId: string
  conflictIds: string[]
  sourceRefs: string[]
  uncertainty: boolean
}

export type EvidenceAwareDecisionFactorResponse = {
  decisionFactors: DecisionFactor[]
  grounding: DecisionFactorGrounding[]
}

export type EvidenceAwareDecisionFactorResponseRecord = {
  provider: 'minimax'
  model: string
  response: unknown
}

export type EvidenceAwareDecisionFactorEnhancerOptions = {
  onResponse?: (record: EvidenceAwareDecisionFactorResponseRecord) => void
}

function responseBody(response: any): any {
  return response?.response !== undefined ? response.response : response
}

function extractJson(response: any): unknown {
  const body = responseBody(response)
  if (body && typeof body === 'object' && !Array.isArray(body)
    && !body.choices && !body.data && !body.content) return body
  const content = body?.choices?.[0]?.message?.content
    ?? body?.data?.choices?.[0]?.message?.content
    ?? (Array.isArray(body?.content)
      ? body.content.map((part: any) => typeof part === 'string' ? part : part?.text || '').join('\n')
      : body)
  return typeof content === 'string' ? parseAIJson(content).data : null
}

function collectInputIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectInputIds)
  if (!value || typeof value !== 'object') return []
  const object = value as Record<string, unknown>
  return [
    ...(typeof object.id === 'string' ? [object.id] : []),
    ...Object.values(object).flatMap(collectInputIds),
  ]
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function parseResponse(value: unknown): EvidenceAwareDecisionFactorResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('evidence_aware_decision_factor_response_invalid')
  }
  const response = value as Record<string, unknown>
  if (!Array.isArray(response.decisionFactors) || !Array.isArray(response.grounding)) {
    throw new Error('evidence_aware_decision_factor_response_invalid')
  }
  const groundingValid = response.grounding.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false
    const entry = item as Record<string, unknown>
    return typeof entry.decisionFactorId === 'string'
      && stringArray(entry.conflictIds)
      && stringArray(entry.sourceRefs)
      && typeof entry.uncertainty === 'boolean'
  })
  if (!groundingValid) throw new Error('evidence_aware_decision_factor_grounding_invalid')
  return response as EvidenceAwareDecisionFactorResponse
}

function assertGrounding(
  response: EvidenceAwareDecisionFactorResponse,
  input: CaseIntelligenceInput,
  conflicts: CaseModel['conflicts'],
  model: CaseModel,
): void {
  const factorIds = response.decisionFactors.map((factor) => factor.id)
  const groundingIds = response.grounding.map((entry) => entry.decisionFactorId)
  if (new Set(factorIds).size !== factorIds.length
    || new Set(groundingIds).size !== groundingIds.length
    || factorIds.length !== groundingIds.length
    || factorIds.some((id) => !groundingIds.includes(id))) {
    throw new Error('evidence_aware_decision_factor_grounding_incomplete')
  }

  const conflictIds = new Set(conflicts.map((conflict) => conflict.id))
  const sourceIds = new Set([
    ...collectInputIds(input.context),
    ...model.timeline.map((entry) => entry.id),
  ])
  const factorsById = new Map(response.decisionFactors.map((factor) => [factor.id, factor]))

  for (const grounding of response.grounding) {
    if (grounding.conflictIds.length === 0
      || grounding.conflictIds.some((id) => !conflictIds.has(id))) {
      throw new Error(`evidence_aware_conflict_reference_invalid:${grounding.decisionFactorId}`)
    }
    if (grounding.sourceRefs.some((id) => !sourceIds.has(id))) {
      throw new Error(`evidence_aware_source_reference_invalid:${grounding.decisionFactorId}`)
    }
    if (grounding.sourceRefs.length === 0) {
      const factor = factorsById.get(grounding.decisionFactorId)
      if (!grounding.uncertainty || factor?.impact !== 'uncertain') {
        throw new Error(`evidence_aware_uncertainty_required:${grounding.decisionFactorId}`)
      }
    }
  }
}

function prompt(
  input: CaseIntelligenceInput,
  model: CaseModel,
  conflicts: CaseModel['conflicts'],
): string {
  return [
    '你是 LawDesk Evidence-Aware Decision Factor Enhancement Prototype。',
    '仅增强 CaseModel.decisionFactors，不得修改其他 CaseModel 字段。',
    '不得生成材料外事实，不得预测裁判结果，不得作出最终法律结论。',
    '每个 decisionFactor 必须关联至少一个 ENHANCED_CONFLICTS 中已有 conflict id。',
    '如有支持来源，sourceRefs 只能引用 CASE_INPUT 中已有 material/evidence/fact id 或 BASE_CASE_MODEL.timeline id。',
    '如缺少具体支持来源，sourceRefs 必须为空、uncertainty 必须为 true，且对应 impact 必须为 uncertain。',
    '只输出 JSON 对象：{"decisionFactors": [...], "grounding": [...] }。',
    'decisionFactors 每项严格包含 id、label、description、impact。',
    'grounding 每项严格包含 decisionFactorId、conflictIds、sourceRefs、uncertainty。',
    `CASE_INPUT:\n${JSON.stringify(input)}`,
    `BASE_CASE_MODEL:\n${JSON.stringify(model)}`,
    `ENHANCED_CONFLICTS:\n${JSON.stringify(conflicts)}`,
  ].join('\n\n')
}

export class EvidenceAwareDecisionFactorEnhancer {
  constructor(
    private readonly generator?: Generator,
    private readonly options: EvidenceAwareDecisionFactorEnhancerOptions = {},
    private readonly validator = new CaseModelValidator(),
  ) {}

  async enhance(
    input: CaseIntelligenceInput,
    baseCaseModel: CaseModel,
    enhancedConflicts: CaseModel['conflicts'],
  ): Promise<CaseModel> {
    const generator = this.generator || ProviderManager.getAdapter()
    const minimaxModel = process.env.MINIMAX_MODEL || process.env.AI_MODEL || 'MiniMax-M3'
    const rawResponse = await generator.generate({
      provider: 'minimax',
      model: minimaxModel,
      prompt_version: 'case-intelligence-evidence-aware-decision-factor-v1',
      task: 'case_intelligence_evidence_aware_decision_factor',
      matter_id: input.case_id,
      max_completion_tokens: 3000,
      system_prompt: '仅输出包含 decisionFactors 与 grounding 的 JSON 对象。',
      user_prompt: prompt(input, baseCaseModel, enhancedConflicts),
    })
    this.options.onResponse?.({ provider: 'minimax', model: minimaxModel, response: rawResponse })

    let response: EvidenceAwareDecisionFactorResponse
    try {
      response = parseResponse(extractJson(rawResponse))
      assertGrounding(response, input, enhancedConflicts, baseCaseModel)
    } catch (caught) {
      const error = caught instanceof Error ? caught : new Error(String(caught))
      ;(error as any).failingStage = 'evidence_aware_decision_factor_enhancement'
      ;(error as any).rawAIResponse = rawResponse
      ;(error as any).provider = 'minimax'
      ;(error as any).model = minimaxModel
      throw error
    }

    const enhanced = { ...baseCaseModel, decisionFactors: response.decisionFactors }
    const validation = this.validator.validate(enhanced, { sourceText: JSON.stringify(input.context) })
    if (!validation.ok) {
      const error = new Error('evidence_aware_decision_factor_invalid')
      ;(error as any).code = 'evidence_aware_decision_factor_invalid'
      ;(error as any).failingStage = 'evidence_aware_decision_factor_enhancement'
      ;(error as any).schemaValidationError = validation
      ;(error as any).rawAIResponse = rawResponse
      ;(error as any).provider = 'minimax'
      ;(error as any).model = minimaxModel
      throw error
    }
    return enhanced
  }
}

export default EvidenceAwareDecisionFactorEnhancer
