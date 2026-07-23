import ProviderManager from '../../../ai/providerManager'
import { parseAIJson } from '../../ai/parseAIJson'
import CaseModelValidator from '../CaseModelValidator'
import EnhancementFactValidator from './EnhancementFactValidator'
import DecisionFactorOutputNormalizer from './DecisionFactorOutputNormalizer'
import type {
  CaseIntelligenceInput,
  CaseModel,
} from '../types/caseModel.types'

type Generator = { generate(promptPack: any): Promise<any> }

export type DecisionFactorEnhancerResponseRecord = {
  provider: 'minimax'
  model: string
  response: unknown
}

export type DecisionFactorEnhancerOptions = {
  onResponse?: (record: DecisionFactorEnhancerResponseRecord) => void
}

function responseBody(response: any): any {
  return response?.response !== undefined ? response.response : response
}

function extractJson(response: any): unknown {
  const body = responseBody(response)
  if (body && typeof body === 'object' && !Array.isArray(body)
    && !body.choices && !body.data && !body.content) return body
  if (Array.isArray(body)) return body
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

function assertGroundedReferences(
  decisionFactors: unknown,
  input: CaseIntelligenceInput,
  model: CaseModel,
): void {
  const allowed = new Set([
    ...model.actors.map((actor) => actor.id),
    ...model.timeline.map((entry) => entry.id),
    ...collectInputIds(input.context),
  ])
  const text = JSON.stringify(decisionFactors) ?? ''
  const references = text.match(/\b(?:actor|timeline|fact|material)-[A-Za-z0-9_-]+\b/g) || []
  const invalid = Array.from(new Set(references.filter((reference) => !allowed.has(reference))))
  if (invalid.length === 0) return
  const error = new Error('decision_factor_reference_invalid')
  ;(error as any).code = 'decision_factor_reference_invalid'
  ;(error as any).failingStage = 'decision_factor_enhancement'
  ;(error as any).invalidReferences = invalid
  throw error
}

function prompt(input: CaseIntelligenceInput, model: CaseModel): string {
  return [
    '你是 LawDesk Decision Factor Enhancement Prototype。',
    '仅增强 CaseModel.decisionFactors，不得修改或输出其他 CaseModel 字段。',
    '只能依据 CASE_INPUT 与 ENHANCED_CASE_MODEL 中已有事实、主体、时间线和冲突识别决策因素。',
    '不得预测裁判结果，不得作出最终法律结论，不得增加材料外事实。',
    '事实边界：decisionFactors[].description 只能引用 ENHANCED_CASE_MODEL 已有 actors、timeline、事实性文本、金额和日期。',
    '禁止在 description 中新增任何日期、金额、主体、事件或证据；不得把推测、常识、可能发生的事项或缺失材料改写为已发生事实。',
    '若信息未知、来源不足或尚待核实，只能在 description 中作为 uncertainty/notes 性质的说明，明确写明“证据不足”“待确认”或“材料未记载”，不得补造未知内容，不得增加 Schema 字段。',
    'DecisionFactor 只能解释已有事实的意义、分析已有争议的影响，或指出已有证据不足；不得扩展案件事实集合。',
    '如引用 actor、timeline、fact 或 material id，只能使用输入中已经存在的 id。',
    '只输出 decisionFactors JSON 数组。每项必须严格包含 id、label、description、impact。',
    'impact 只能是 supportive、adverse、neutral、uncertain。',
    `CASE_INPUT:\n${JSON.stringify(input)}`,
    `ENHANCED_CASE_MODEL:\n${JSON.stringify(model)}`,
  ].join('\n\n')
}

export class DecisionFactorEnhancer {
  constructor(
    private readonly generator?: Generator,
    private readonly options: DecisionFactorEnhancerOptions = {},
    private readonly validator = new CaseModelValidator(),
    private readonly factValidator = new EnhancementFactValidator(),
    private readonly outputNormalizer = new DecisionFactorOutputNormalizer(),
  ) {}

  async enhance(input: CaseIntelligenceInput, model: CaseModel): Promise<CaseModel> {
    const generator = this.generator || ProviderManager.getAdapter()
    const minimaxModel = process.env.MINIMAX_MODEL || process.env.AI_MODEL || 'MiniMax-M3'
    const response = await generator.generate({
      provider: 'minimax',
      model: minimaxModel,
      prompt_version: 'case-intelligence-decision-factor-enhancement-v2',
      task: 'case_intelligence_decision_factor_enhancement',
      matter_id: input.case_id,
      max_completion_tokens: 2500,
      system_prompt: '仅输出符合 CaseModel decisionFactors Schema 的 JSON 数组。',
      user_prompt: prompt(input, model),
    })
    this.options.onResponse?.({ provider: 'minimax', model: minimaxModel, response })

    const decisionFactors = this.outputNormalizer.normalize(extractJson(response))
    assertGroundedReferences(decisionFactors, input, model)
    const enhanced = { ...model, decisionFactors } as CaseModel
    const factValidation = this.factValidator.validate(model, enhanced)
    if (!factValidation.ok) {
      const error = new Error('enhancement_fact_invalid')
      ;(error as any).code = 'enhancement_fact_invalid'
      ;(error as any).failingStage = 'enhancement_fact_validation'
      ;(error as any).schemaValidationError = factValidation
      ;(error as any).rawAIResponse = response
      ;(error as any).provider = 'minimax'
      ;(error as any).model = minimaxModel
      throw error
    }
    const validation = this.validator.validate(enhanced, { sourceText: JSON.stringify(input.context) })
    if (!validation.ok) {
      const error = new Error('decision_factor_enhancement_invalid')
      ;(error as any).code = 'decision_factor_enhancement_invalid'
      ;(error as any).failingStage = 'decision_factor_enhancement'
      ;(error as any).schemaValidationError = validation
      ;(error as any).rawAIResponse = response
      ;(error as any).provider = 'minimax'
      ;(error as any).model = minimaxModel
      throw error
    }
    return enhanced
  }
}

export default DecisionFactorEnhancer
