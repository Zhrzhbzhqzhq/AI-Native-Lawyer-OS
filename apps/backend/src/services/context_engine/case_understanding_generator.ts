import ProviderManager from '../../ai/providerManager'
import { parseAIJson } from '../ai/parseAIJson'
import {
  CASE_UNDERSTANDING_CONTRACT_VERSION,
  CASE_UNDERSTANDING_SCHEMA_V1,
  type CaseUnderstandingResult,
} from './case_understanding_schema'
import CaseUnderstandingValidator from './case_understanding_validator'
import type { MinimalMatterContextSnapshot } from './context_types'

type Generator = { generate(promptPack: any): Promise<any> }

export type { CaseUnderstandingResult } from './case_understanding_schema'

export type CaseUnderstandingGeneration = {
  provider: 'minimax'
  model: string
  promptLength: number
  rawResponse: unknown
} & ({
  ok: true
  result: CaseUnderstandingResult
} | {
  ok: false
  error: { code: string; message: string }
})

function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function responseContent(response: any): unknown {
  const body = response?.response !== undefined ? response.response : response
  return body?.choices?.[0]?.message?.content
    ?? body?.data?.choices?.[0]?.message?.content
    ?? (Array.isArray(body?.content)
      ? body.content.map((part: any) => typeof part === 'string' ? part : part?.text || '').join('\n')
      : body)
}

function parseResult(response: unknown): unknown {
  const content = responseContent(response)
  if (isObject(content)) return content
  return typeof content === 'string' ? parseAIJson(content).data : null
}

function errorDetails(error: unknown) {
  const candidate = error as { code?: unknown; message?: unknown; rawAIResponse?: unknown }
  return {
    code: String(candidate?.code || candidate?.message || 'case_understanding_provider_failed'),
    message: String(candidate?.message || candidate?.code || 'case_understanding_provider_failed'),
    rawResponse: candidate?.rawAIResponse ?? null,
  }
}

export function buildCaseUnderstandingPrompt(snapshot: MinimalMatterContextSnapshot) {
  return [
    `任务：仅根据 CONTEXT_SNAPSHOT 生成符合 ${CASE_UNDERSTANDING_CONTRACT_VERSION} 的案件理解结果。`,
    'CONTEXT_SNAPSHOT 已包含当前 Matter 及其完整可读材料正文，必须逐份阅读，不得只依据标题或 Matter description 推测。',
    '不得使用材料之外的信息，不得生成 Fact、Issue、Evidence、Law、Argument 或 Document。',
    '材料中的主张、争议和不确定事项必须保持原有性质，不得改写为已确认结论。',
    '必须输出 Schema 中全部 required 字段；所有字符串必须包含实际文字，禁止空字符串和纯空白字符串。',
    '无法从材料确认的字段必须逐字填写“待确认”，禁止使用空字符串、unknown、未知、不详或待定。',
    'identity.caseType 必须结合案件标题、合同或行为性质、主体关系及核心争议识别，不得留空；材料足以识别时必须输出具体案件类型。',
    'actors 必须覆盖案件主要主体；actorIds 只能引用 actors 中已声明的 id。',
    'timeline 必须逐项覆盖材料中明确记载的关键日期、合同成立、付款、履行、通知、交付及争议发生等事件；日期不明确时填写“待确认”。',
    'conflicts 必须非空，并将材料中彼此独立的核心分歧分别列出，不得只给抽象结论。',
    'unknowns 只能记录材料尚未确认且会影响案件理解的事项；没有可靠未知事项时输出 []。',
    '只输出一个合法 JSON 对象，不得输出 Markdown、代码块或解释。',
    `JSON_SCHEMA:\n${JSON.stringify(CASE_UNDERSTANDING_SCHEMA_V1)}`,
    `CONTEXT_SNAPSHOT:\n${JSON.stringify(snapshot, null, 2)}`,
  ].join('\n\n')
}

export class CaseUnderstandingGenerator {
  constructor(
    private readonly generator?: Generator,
    private readonly validator = new CaseUnderstandingValidator(),
  ) {}

  async generate(snapshot: MinimalMatterContextSnapshot): Promise<CaseUnderstandingGeneration> {
    const model = process.env.MINIMAX_MODEL || process.env.AI_MODEL || 'MiniMax-M3'
    const userPrompt = buildCaseUnderstandingPrompt(snapshot)
    try {
      const response = await (this.generator || ProviderManager.getAdapter()).generate({
        provider: 'minimax',
        model,
        prompt_version: 'context-engine-c0.1-case-understanding-v2',
        task: 'context_engine_case_understanding',
        matter_id: snapshot.matterId,
        max_completion_tokens: 5000,
        context_pack: snapshot,
        system_prompt: '你是 LawDesk Context Engine 案件理解助手。严格依据完整 Context Snapshot，仅输出指定 JSON。',
        user_prompt: userPrompt,
      })
      const parsed = parseResult(response)
      const validation = this.validator.validate(parsed)
      if (!validation.ok) {
        return {
          ok: false,
          provider: 'minimax',
          model,
          promptLength: userPrompt.length,
          rawResponse: response,
          error: {
            code: parsed === null ? 'case_understanding_json_parse_failed' : 'case_understanding_schema_invalid',
            message: parsed === null
              ? 'MiniMax response is not valid JSON.'
              : `MiniMax response violates Case Understanding Contract V1: ${JSON.stringify(validation.issues)}`,
          },
        }
      }
      return {
        ok: true,
        provider: 'minimax',
        model,
        promptLength: userPrompt.length,
        rawResponse: response,
        result: validation.value,
      }
    } catch (error) {
      const details = errorDetails(error)
      return {
        ok: false,
        provider: 'minimax',
        model,
        promptLength: userPrompt.length,
        rawResponse: details.rawResponse,
        error: { code: details.code, message: details.message },
      }
    }
  }
}

export default CaseUnderstandingGenerator
