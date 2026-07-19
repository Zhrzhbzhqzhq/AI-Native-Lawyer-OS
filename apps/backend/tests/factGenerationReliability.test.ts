import { afterEach, describe, expect, it, vi } from 'vitest'
import { MiniMaxAdapter } from '../src/ai/minimaxAdapter'
import MiniMaxAnthropicAdapter from '../src/ai/minimaxAnthropicAdapter'
import AIService from '../src/services/ai/AIService'

const validFact = {
  title: '设备完成交付',
  description: '供方交付设备，收货人员在交付记录上签收。',
  category: 'confirmed',
  evidence_titles: ['交付与签收证据'],
}

function miniMaxResponse(content: string, finishReason = 'stop') {
  return {
    provider: 'minimax',
    model: 'MiniMax-M3',
    response: {
      choices: [{
        finish_reason: finishReason,
        message: { content },
      }],
    },
    finish_reason: finishReason,
  }
}

function createFactService(responses: any[]) {
  const service = new AIService({
    evidence: {
      findMany: vi.fn().mockResolvedValue([{ title: '交付与签收证据' }]),
    },
  } as any)
  ;(service as any).contextBuilder = {
    buildMatterContext: vi.fn().mockResolvedValue({
      matter: { matter_id: 'matter-1', title: '测试案件' },
      materials: [],
      evidence: [{ title: '交付与签收证据' }],
    }),
  }
  const generate = vi.fn()
  for (const response of responses) generate.mockResolvedValueOnce(response)
  ;(service as any).adapter = { generate }
  return { service, generate }
}

describe('M150.3.1 Fact Generation Reliability', () => {
  const originalFetch = globalThis.fetch
  const originalKey = process.env.MINIMAX_API_KEY
  const originalProvider = process.env.AI_PROVIDER

  afterEach(() => {
    globalThis.fetch = originalFetch
    process.env.MINIMAX_API_KEY = originalKey
    process.env.AI_PROVIDER = originalProvider
  })

  it('returns valid Facts without retry', async () => {
    const { service, generate } = createFactService([
      miniMaxResponse(JSON.stringify([validFact])),
    ])

    await expect(service.analyzeFacts('matter-1')).resolves.toEqual([validFact])
    expect(generate).toHaveBeenCalledTimes(1)
  })

  it('retries once when finish_reason is length', async () => {
    const { service, generate } = createFactService([
      miniMaxResponse('[{"title":"被截断', 'length'),
      miniMaxResponse(JSON.stringify([validFact])),
    ])

    await expect(service.analyzeFacts('matter-1')).resolves.toEqual([validFact])
    expect(generate).toHaveBeenCalledTimes(2)
    expect(generate.mock.calls[0][0].user_prompt).toContain('最多返回 8 条核心事实')
    expect(generate.mock.calls[1][0].user_prompt).toContain('最多返回 6 条核心事实')
    expect(generate.mock.calls[1][0].user_prompt).toContain('description 不超过 120 个中文字符')
    expect(generate.mock.calls[1][0].user_prompt).toContain('仅输出完整、合法、闭合的 JSON 数组')
    expect(generate.mock.calls[1][0].user_prompt).toContain('不输出 Markdown、代码块、注释、前言、结语或任何解释文本')
  })

  it('retries once when JSON parsing fails without a length finish reason', async () => {
    const { service, generate } = createFactService([
      miniMaxResponse('结果如下：[{"title":"未闭合"'),
      miniMaxResponse(JSON.stringify([validFact])),
    ])

    await expect(service.analyzeFacts('matter-1')).resolves.toEqual([validFact])
    expect(generate).toHaveBeenCalledTimes(2)
  })

  it('keeps validator failure as a retry condition', async () => {
    const invalidFact = { ...validFact, evidence_titles: [] }
    const { service, generate } = createFactService([
      miniMaxResponse(JSON.stringify([invalidFact])),
      miniMaxResponse(JSON.stringify([validFact])),
    ])

    await expect(service.analyzeFacts('matter-1')).resolves.toEqual([validFact])
    expect(generate).toHaveBeenCalledTimes(2)
  })

  it('does not return or save partial Facts when the single retry also fails', async () => {
    process.env.AI_PROVIDER = 'minimax'
    const { service, generate } = createFactService([
      miniMaxResponse('[{"title":"第一次截断', 'length'),
      miniMaxResponse('[{"title":"第二次截断', 'length'),
    ])

    await expect(service.analyzeFacts('matter-1')).rejects.toThrow('ai_provider_invalid_response')
    expect(generate).toHaveBeenCalledTimes(2)
  })

  it('uses the Fact token budget and normalizes OpenAI-compatible finish_reason', async () => {
    process.env.MINIMAX_API_KEY = 'test-key'
    let requestBody: any
    globalThis.fetch = vi.fn(async (_url: any, options: any) => {
      requestBody = JSON.parse(options.body)
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ finish_reason: 'length', message: { content: '[]' } }],
          usage: { prompt_tokens: 10, completion_tokens: 20 },
        }),
      } as any
    }) as any

    const result = await new MiniMaxAdapter().generate({
      task: 'analyze_facts',
      prompt_version: 'fact-draft-v1',
      user_prompt: 'facts',
    })

    expect(requestBody.max_completion_tokens).toBe(4000)
    expect(result.finish_reason).toBe('length')
  })

  it('uses the Fact token budget and normalizes Anthropic max_tokens', async () => {
    process.env.MINIMAX_API_KEY = 'test-key'
    let requestBody: any
    globalThis.fetch = vi.fn(async (_url: any, options: any) => {
      requestBody = JSON.parse(options.body)
      return {
        ok: true,
        status: 200,
        json: async () => ({
          stop_reason: 'max_tokens',
          content: [{ type: 'text', text: '[]' }],
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
      } as any
    }) as any

    const result = await new MiniMaxAnthropicAdapter().generate({
      task: 'analyze_facts',
      prompt_version: 'fact-draft-v1',
      user_prompt: 'facts',
    })

    expect(requestBody.max_tokens).toBe(4000)
    expect(result.finish_reason).toBe('length')
  })
})
