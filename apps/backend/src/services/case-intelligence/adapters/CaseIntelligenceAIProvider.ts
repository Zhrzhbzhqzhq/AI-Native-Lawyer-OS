import ProviderManager from '../../../ai/providerManager'
import { parseAIJson } from '../../ai/parseAIJson'
import { buildCaseStagePrompt } from '../prompts'
import type { CasePipelineContext } from '../pipeline/CasePipelineContext'
import type { CaseIntelligenceProvider, CaseStageName } from '../pipeline/MockCaseIntelligenceProvider'

type Generator = { generate(promptPack: any): Promise<any> }

export type CaseIntelligenceRawResponseRecord = {
  stage: CaseStageName
  attempt: number
  provider: 'minimax'
  model: string
  response: unknown
}

export type CaseIntelligenceAIProviderOptions = {
  onResponse?: (record: CaseIntelligenceRawResponseRecord) => void
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

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function strings(value: unknown, fields: string[]) {
  return isObject(value) && fields.every((field) => typeof value[field] === 'string')
}

export function validateCaseStageOutput(stage: CaseStageName, value: unknown): boolean {
  switch (stage) {
    case 'material':
      return Array.isArray(value) && value.every((item) => strings(item, ['id', 'title', 'content']))
    case 'identity':
      return strings(value, ['caseId', 'title', 'caseType', 'stage', 'jurisdiction'])
    case 'narrative':
      return strings(value, ['summary', 'background', 'currentPosture'])
    case 'actor':
      return isObject(value) && Array.isArray(value.actors) && Array.isArray(value.timeline)
        && value.actors.every((item) => strings(item, ['id', 'name', 'role', 'position']))
        && value.timeline.every((item) => strings(item, ['id', 'date', 'event']) && Array.isArray(item.actorIds)
          && ['confirmed', 'disputed', 'unknown'].includes(String(item.certainty)))
    case 'conflict':
      return Array.isArray(value) && value.every((item) => strings(item, ['id', 'title', 'description']) && Array.isArray(item.actorIds))
    case 'factor':
      return Array.isArray(value) && value.every((item) => strings(item, ['id', 'label', 'description'])
        && ['supportive', 'adverse', 'neutral', 'uncertain'].includes(String(item.impact)))
    case 'risk':
      return Array.isArray(value) && value.every((item) => strings(item, ['id', 'description', 'mitigation'])
        && ['low', 'medium', 'high'].includes(String(item.severity)))
    case 'review':
      return isObject(value) && Array.isArray(value.unknowns) && isObject(value.selfReview)
        && value.unknowns.every((item) => strings(item, ['id', 'question']) && ['low', 'medium', 'high'].includes(String(item.importance)))
        && typeof value.selfReview.confidence === 'number'
        && value.selfReview.confidence >= 0 && value.selfReview.confidence <= 1
        && Array.isArray(value.selfReview.limitations) && Array.isArray(value.selfReview.assumptions)
        && typeof value.selfReview.requiresLawyerReview === 'boolean'
  }
}

export class CaseIntelligenceAIProvider implements CaseIntelligenceProvider {
  constructor(
    private readonly generator?: Generator,
    private readonly options: CaseIntelligenceAIProviderOptions = {},
  ) {}

  async provide<T>(stage: CaseStageName, context: Readonly<CasePipelineContext>): Promise<T> {
    const generator = this.generator || ProviderManager.getAdapter()
    const model = process.env.MINIMAX_MODEL || process.env.AI_MODEL || 'MiniMax-M3'
    let reason = 'case_intelligence_ai_invalid_response'
    let lastResponse: unknown
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await generator.generate({
        provider: 'minimax',
        model,
        prompt_version: 'case-intelligence-v1',
        task: `case_intelligence_${stage}`,
        matter_id: context.input.case_id,
        max_completion_tokens: 3000,
        context_pack: context,
        system_prompt: '仅输出符合要求的 JSON。',
        user_prompt: buildCaseStagePrompt(stage, context, attempt === 1),
      })
      lastResponse = response
      this.options.onResponse?.({ stage, attempt: attempt + 1, provider: 'minimax', model, response })
      if (finishReason(response) === 'length') {
        reason = 'case_intelligence_response_truncated'
        continue
      }
      const parsed = extractJson(response)
      if (parsed === null) {
        reason = 'case_intelligence_json_parse_failed'
        continue
      }
      if (!validateCaseStageOutput(stage, parsed)) {
        reason = 'case_intelligence_schema_validation_failed'
        continue
      }
      return parsed as T
    }
    const error = new Error(reason)
    ;(error as any).code = reason
    ;(error as any).failingStage = stage
    ;(error as any).schemaValidationError = {
      code: reason,
      message: reason === 'case_intelligence_schema_validation_failed'
        ? `Response does not match the ${stage} stage schema.`
        : 'A schema-valid Case Intelligence response could not be produced.',
    }
    ;(error as any).rawAIResponse = lastResponse
    ;(error as any).provider = 'minimax'
    ;(error as any).model = model
    throw error
  }
}

export default CaseIntelligenceAIProvider
