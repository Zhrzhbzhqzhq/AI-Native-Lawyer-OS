import ProviderManager from '../../../ai/providerManager'
import { parseAIJson } from '../../ai/parseAIJson'
import type { CaseIntelligenceInput } from '../types/caseModel.types'
import InitialUnderstandingNormalizer from './InitialUnderstandingNormalizer'

export type InitialUnderstanding = {
  caseNature: string
  summary: string
  importantFacts: string[]
  possibleConflicts: string[]
  uncertainties: string[]
}

type Generator = { generate(promptPack: any): Promise<any> }

function responseBody(response: any) {
  return response?.response !== undefined ? response.response : response
}

function extractJson(response: any) {
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

function isInitialUnderstanding(value: unknown): value is InitialUnderstanding {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const result = value as Record<string, unknown>
  return typeof result.caseNature === 'string'
    && typeof result.summary === 'string'
    && ['importantFacts', 'possibleConflicts', 'uncertainties'].every((field) => (
      Array.isArray(result[field]) && (result[field] as unknown[]).every((item) => typeof item === 'string')
    ))
}

function prompt(input: CaseIntelligenceInput) {
  return [
    '仅根据 CASE_INPUT 对案件进行一次初始理解。',
    '只输出 JSON，不要 Markdown 或解释，不得增加材料中不存在的事实。',
    '输出必须严格为：',
    JSON.stringify({
      type: 'object',
      additionalProperties: false,
      required: ['caseNature', 'summary', 'importantFacts', 'possibleConflicts', 'uncertainties'],
      properties: {
        caseNature: { type: 'string' },
        summary: { type: 'string' },
        importantFacts: { type: 'array', items: { type: 'string' } },
        possibleConflicts: { type: 'array', items: { type: 'string' } },
        uncertainties: { type: 'array', items: { type: 'string' } },
      },
    }),
    `CASE_INPUT:\n${JSON.stringify(input)}`,
  ].join('\n\n')
}

export class InitialReader {
  constructor(
    private readonly generator?: Generator,
    private readonly normalizer = new InitialUnderstandingNormalizer(),
  ) {}

  async read(input: CaseIntelligenceInput): Promise<InitialUnderstanding> {
    const model = process.env.MINIMAX_MODEL || process.env.AI_MODEL || 'MiniMax-M3'
    const response = await (this.generator || ProviderManager.getAdapter()).generate({
      provider: 'minimax',
      model,
      prompt_version: 'case-intelligence-hybrid-initial-v1',
      task: 'case_intelligence_hybrid_initial',
      matter_id: input.case_id,
      max_completion_tokens: 2500,
      system_prompt: '你是 Hybrid Case Intelligence Initial Reader。只输出符合 Schema 的 JSON。',
      user_prompt: prompt(input),
    })
    const parsed = extractJson(response)
    const normalized = this.normalizer.normalize(parsed)
    if (!isInitialUnderstanding(normalized)) {
      const error = new Error('hybrid_initial_understanding_invalid')
      ;(error as any).code = 'hybrid_initial_understanding_invalid'
      ;(error as any).failingStage = 'initial_understanding'
      ;(error as any).rawAIResponse = response
      ;(error as any).provider = 'minimax'
      ;(error as any).model = model
      throw error
    }
    return normalized
  }
}

export default InitialReader
