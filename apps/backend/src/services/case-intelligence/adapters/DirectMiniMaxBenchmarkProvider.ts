import ProviderManager from '../../../ai/providerManager'
import { parseAIJson } from '../../ai/parseAIJson'
import { normalizeCaseModel } from '../CaseModelNormalizer'
import CaseEvaluationService from '../CaseEvaluationService'
import CaseModelValidator from '../CaseModelValidator'
import { buildDirectMiniMaxBenchmarkPromptV2 } from '../prompts/DirectMiniMaxBenchmarkPromptV2'
import type {
  CaseIntelligenceInput,
  CaseComparisonEvaluation,
  CaseModel,
  CaseModelValidationResult,
} from '../types/caseModel.types'

type Generator = { generate(promptPack: any): Promise<any> }

export type DirectMiniMaxResponseRecord = {
  attempt: number
  provider: 'minimax'
  model: string
  response: unknown
}

export type DirectMiniMaxBenchmarkProviderOptions = {
  onResponse?: (record: DirectMiniMaxResponseRecord) => void
}

export type DirectMiniMaxBenchmarkResult = {
  model: CaseModel
  evaluation: CaseComparisonEvaluation
}

function responseBody(response: any) {
  return response?.response !== undefined ? response.response : response
}

function finishReason(response: any) {
  const body = responseBody(response)
  const reason = response?.finish_reason
    ?? body?.choices?.[0]?.finish_reason
    ?? body?.data?.choices?.[0]?.finish_reason
    ?? body?.stop_reason
    ?? response?.stop_reason
    ?? null
  return reason === 'max_tokens' ? 'length' : reason
}

function extractJson(response: any) {
  const layers: any[] = []
  const seen = new Set<any>()
  let current = response
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
      ?? (Array.isArray(layer?.content)
        ? layer.content.map((part: any) => typeof part === 'string' ? part : part?.text || '').join('\n')
        : undefined)
    if (typeof content === 'string') return parseAIJson(content).data
  }

  for (const layer of [...layers].reverse()) {
    if (typeof layer === 'string') return parseAIJson(layer).data
    if (layer && typeof layer === 'object' && !Array.isArray(layer)
      && !layer.response && !layer.choices && !layer.data && !layer.content) return layer
  }
  return null
}

export class DirectMiniMaxBenchmarkProvider {
  constructor(
    private readonly generator?: Generator,
    private readonly options: DirectMiniMaxBenchmarkProviderOptions = {},
    private readonly validator = new CaseModelValidator(),
    private readonly evaluator = new CaseEvaluationService(),
  ) {}

  async run(
    input: CaseIntelligenceInput,
    golden: CaseModel,
  ): Promise<DirectMiniMaxBenchmarkResult> {
    const goldenValidation = this.validator.validate(golden)
    if (!goldenValidation.ok) {
      const error = new Error('direct_minimax_golden_invalid')
      ;(error as any).code = 'direct_minimax_golden_invalid'
      ;(error as any).schemaValidationError = goldenValidation
      throw error
    }
    const model = await this.generateCaseModel(input)
    return { model, evaluation: this.evaluator.compare(model, golden) }
  }

  async generateCaseModel(input: CaseIntelligenceInput): Promise<CaseModel> {
    const generator = this.generator || ProviderManager.getAdapter()
    const model = process.env.MINIMAX_MODEL || process.env.AI_MODEL || 'MiniMax-M3'
    let reason = 'direct_minimax_invalid_response'
    let validation: CaseModelValidationResult | undefined
    let lastResponse: unknown

    const response = await generator.generate({
      provider: 'minimax',
      model,
      prompt_version: 'case-intelligence-direct-benchmark-v2',
      task: 'case_intelligence_direct_benchmark',
      matter_id: input.case_id,
      max_completion_tokens: 6000,
      system_prompt: '你是 Direct MiniMax CaseModel Benchmark Provider。严格执行用户 Prompt 中的 JSON Schema，仅输出 JSON。',
      user_prompt: buildDirectMiniMaxBenchmarkPromptV2(input),
    })
    lastResponse = response
    this.options.onResponse?.({ attempt: 1, provider: 'minimax', model, response })

    if (finishReason(response) === 'length') {
      reason = 'direct_minimax_response_truncated'
    } else {
      const parsed = extractJson(response)
      if (parsed === null) {
        reason = 'direct_minimax_json_parse_failed'
      } else {
        const normalized = normalizeCaseModel(parsed)
        validation = this.validator.validate(normalized, { sourceText: JSON.stringify(input.context) })
        if (validation.ok) return normalized as CaseModel
        reason = 'direct_minimax_schema_validation_failed'
      }
    }

    const error = new Error(reason)
    ;(error as any).code = reason
    ;(error as any).failingStage = 'direct_case_model'
    ;(error as any).schemaValidationError = validation || { code: reason }
    ;(error as any).rawAIResponse = lastResponse
    ;(error as any).provider = 'minimax'
    ;(error as any).model = model
    throw error
  }
}

export default DirectMiniMaxBenchmarkProvider
