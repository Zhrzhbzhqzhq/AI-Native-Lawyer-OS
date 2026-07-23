import ProviderManager from '../../../ai/providerManager'
import { parseAIJson } from '../../ai/parseAIJson'
import CaseModelValidator from '../CaseModelValidator'
import type {
  CaseIntelligenceInput,
  CaseModel,
} from '../types/caseModel.types'
import ConflictEnhancementNormalizer from './ConflictEnhancementNormalizer'

type Generator = { generate(promptPack: any): Promise<any> }

export type ConflictEnhancerResponseRecord = {
  provider: 'minimax'
  model: string
  response: unknown
}

export type ConflictEnhancerOptions = {
  onResponse?: (record: ConflictEnhancerResponseRecord) => void
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

function prompt(input: CaseIntelligenceInput, model: CaseModel): string {
  return [
    '你是 LawDesk Conflict Enhancement Prototype。',
    '仅增强 CaseModel.conflicts，不得修改或输出其他 CaseModel 字段。',
    '只能依据 CASE_INPUT 和 DIRECT_CASE_MODEL 中已有信息识别双方具体分歧，不得预测裁判结果或补造事实。',
    '只输出 conflicts JSON 数组。每项必须严格包含 id、title、description、actorIds。',
    'actorIds 只能引用 DIRECT_CASE_MODEL.actors 中已经存在的 id。',
    `CASE_INPUT:\n${JSON.stringify(input)}`,
    `DIRECT_CASE_MODEL:\n${JSON.stringify(model)}`,
  ].join('\n\n')
}

export class ConflictEnhancer {
  constructor(
    private readonly generator?: Generator,
    private readonly options: ConflictEnhancerOptions = {},
    private readonly validator = new CaseModelValidator(),
    private readonly normalizer = new ConflictEnhancementNormalizer(),
  ) {}

  async enhance(input: CaseIntelligenceInput, model: CaseModel): Promise<CaseModel> {
    const generator = this.generator || ProviderManager.getAdapter()
    const minimaxModel = process.env.MINIMAX_MODEL || process.env.AI_MODEL || 'MiniMax-M3'
    const response = await generator.generate({
      provider: 'minimax',
      model: minimaxModel,
      prompt_version: 'case-intelligence-conflict-enhancement-v1',
      task: 'case_intelligence_conflict_enhancement',
      matter_id: input.case_id,
      max_completion_tokens: 2500,
      system_prompt: '仅输出符合 CaseModel conflicts Schema 的 JSON 数组。',
      user_prompt: prompt(input, model),
    })
    this.options.onResponse?.({ provider: 'minimax', model: minimaxModel, response })

    const conflicts = this.normalizer.normalize(extractJson(response), model)
    const enhanced = { ...model, conflicts } as CaseModel
    const validation = this.validator.validate(enhanced, { sourceText: JSON.stringify(input.context) })
    if (!validation.ok) {
      const error = new Error('conflict_enhancement_invalid')
      ;(error as any).code = 'conflict_enhancement_invalid'
      ;(error as any).failingStage = 'conflict_enhancement'
      ;(error as any).schemaValidationError = validation
      ;(error as any).rawAIResponse = response
      ;(error as any).provider = 'minimax'
      ;(error as any).model = minimaxModel
      throw error
    }
    return enhanced
  }
}

export default ConflictEnhancer
