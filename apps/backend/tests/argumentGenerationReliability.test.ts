import { afterEach, describe, expect, it, vi } from 'vitest'
import AIService from '../src/services/ai/AIService'
import { buildArgumentPrompt } from '../src/services/ai/AIPromptTemplates'
import { FORMAL_LAW_V2_HEADER, serializeFormalLawV2 } from '../src/services/formalSemanticCodec'

const validArgument = {
  title: '付款义务的阶段性论证',
  issue_title: '付款义务是否履行',
  fact_titles: ['付款记录'],
  law_citations: ['《测试法》第一条'],
  position: '现有来源可支持对付款履行情况作进一步审查。',
  reasoning: '付款记录与适用规则共同构成当前论证基础。',
  counter_argument: '对方可能主张存在其他付款或抵扣。',
  response: '应结合完整流水和合同约定逐项核对。',
  risk: '付款范围和款项性质仍需律师审核。',
  conclusion: '现有来源形成阶段性观点，最终结论仍待律师审核。',
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

function createArgumentService(responses: any[]) {
  const argumentDraftCreate = vi.fn()
  const service = new AIService({
    fact: {
      findMany: vi.fn().mockResolvedValue([
        { fact_id: 'fact-1', title: '付款记录', description: '买方支付了部分款项。', status: 'confirmed' },
      ]),
    },
    issue: {
      findMany: vi.fn().mockResolvedValue([
        { issue_id: 'issue-1', title: '付款义务是否履行', description: '审查付款义务履行情况。' },
      ]),
    },
    law: {
      findMany: vi.fn().mockResolvedValue([
        {
          law_id: 'law-1',
          title: '付款规则',
          citation: '《测试法》第一条',
          description: serializeFormalLawV2({
            rule_content: '付款义务应按约履行。',
            application: '结合付款记录审查履行范围。',
            limitations: '仍需律师核验。',
            jurisdiction: '中华人民共和国大陆地区',
            source_reference: '律师核验来源',
          }),
        },
      ]),
    },
    issueFact: {
      findMany: vi.fn().mockResolvedValue([
        {
          issue_id: 'issue-1',
          fact_id: 'fact-1',
          fact: { fact_id: 'fact-1', title: '付款记录', description: '买方支付了部分款项。' },
        },
      ]),
    },
    lawIssue: {
      findMany: vi.fn().mockResolvedValue([
        { law_id: 'law-1', issue_id: 'issue-1' },
      ]),
    },
    argumentDraft: {
      create: argumentDraftCreate,
    },
  } as any)
  ;(service as any).contextBuilder = {
    buildMatterContext: vi.fn().mockResolvedValue({
      matter: { matter_id: 'matter-1', title: '测试案件' },
      facts: [{ fact_id: 'fact-1', title: '付款记录', status: 'confirmed' }],
      issues: [{ issue_id: 'issue-1', title: '付款义务是否履行', source_fact_ids: ['fact-1'] }],
      laws: [{ law_id: 'law-1', citation: '《测试法》第一条', source_issue_ids: ['issue-1'] }],
    }),
  }
  const generate = vi.fn()
  for (const response of responses) generate.mockResolvedValueOnce(response)
  ;(service as any).adapter = { generate }
  return { service, generate, argumentDraftCreate }
}

describe('M150.6.1 Argument Generation Reliability', () => {
  const originalProvider = process.env.AI_PROVIDER

  afterEach(() => {
    process.env.AI_PROVIDER = originalProvider
  })

  it('returns a valid Argument without retry and uses the dedicated budget', async () => {
    const { service, generate } = createArgumentService([
      miniMaxResponse(JSON.stringify([validArgument])),
    ])

    await expect(service.analyzeArguments('matter-1')).resolves.toEqual([
      { ...validArgument, source_fact_ids: [], source_issue_ids: [], source_law_ids: [] },
    ])
    expect(generate).toHaveBeenCalledTimes(1)
    expect(generate.mock.calls[0][0].max_completion_tokens).toBe(6000)
    expect(generate.mock.calls[0][0].user_prompt).toContain('付款义务应按约履行')
    expect(generate.mock.calls[0][0].user_prompt).not.toContain(FORMAL_LAW_V2_HEADER)
  })

  it('retries once when finish_reason is length even if the content parses', async () => {
    const { service, generate } = createArgumentService([
      miniMaxResponse(JSON.stringify([validArgument]), 'length'),
      miniMaxResponse(JSON.stringify([validArgument])),
    ])

    await expect(service.analyzeArguments('matter-1')).resolves.toHaveLength(1)
    expect(generate).toHaveBeenCalledTimes(2)
    expect(generate.mock.calls[1][0].max_completion_tokens).toBe(6000)
  })

  it('retries once when truncated JSON cannot be parsed', async () => {
    const { service, generate } = createArgumentService([
      miniMaxResponse('[{"title":"被截断'),
      miniMaxResponse(JSON.stringify([validArgument])),
    ])

    await expect(service.analyzeArguments('matter-1')).resolves.toHaveLength(1)
    expect(generate).toHaveBeenCalledTimes(2)
  })

  it('keeps validator failure as a retry condition', async () => {
    const invalidArgument = { ...validArgument, risk: '' }
    const { service, generate } = createArgumentService([
      miniMaxResponse(JSON.stringify([invalidArgument])),
      miniMaxResponse(JSON.stringify([validArgument])),
    ])

    await expect(service.analyzeArguments('matter-1')).resolves.toHaveLength(1)
    expect(generate).toHaveBeenCalledTimes(2)
  })

  it('uses a compact JSON-only prompt for the single retry', async () => {
    const { service, generate } = createArgumentService([
      miniMaxResponse('not-json'),
      miniMaxResponse(JSON.stringify([validArgument])),
    ])

    await service.analyzeArguments('matter-1')
    const retryPrompt = generate.mock.calls[1][0].user_prompt
    expect(retryPrompt).toContain('最多返回 4 条 Argument')
    expect(retryPrompt).toContain('必须且只能对应一个 Issue')
    expect(retryPrompt).toContain('只能引用该 Issue 直接关联的 Fact')
    expect(retryPrompt).toContain('只能引用该 Issue 直接关联的 Law')
    expect(retryPrompt).toContain('只返回完整、合法、闭合的 JSON 数组')
    expect(generate.mock.calls[0][0].user_prompt).toContain('Argument Scopes')
    expect(retryPrompt).toContain('Argument Scopes')
    expect(retryPrompt).toContain('付款义务是否履行')
    expect(retryPrompt).toContain('付款记录')
    expect(retryPrompt).toContain('《测试法》第一条')
    expect(generate.mock.calls[1][0].context_pack.argumentScopes)
      .toEqual(generate.mock.calls[0][0].context_pack.argumentScopes)
  })

  it('does not return or save partial Arguments when the single retry also fails', async () => {
    process.env.AI_PROVIDER = 'minimax'
    const { service, generate, argumentDraftCreate } = createArgumentService([
      miniMaxResponse('[{"title":"第一次截断', 'length'),
      miniMaxResponse('[{"title":"第二次截断', 'length'),
    ])

    await expect(service.analyzeArguments('matter-1')).rejects.toThrow('ai_provider_invalid_response')
    expect(generate).toHaveBeenCalledTimes(2)
    expect(argumentDraftCreate).not.toHaveBeenCalled()
  })

  it('builds the compact retry constraints without changing the base prompt schema', () => {
    const context = {
      argumentScopes: [{
        issue_title: '付款义务是否履行',
        allowed_facts: [{ title: '付款记录' }],
        allowed_laws: [{ citation: '《测试法》第一条' }],
      }],
    }
    const basePrompt = buildArgumentPrompt(context)
    const retryPrompt = buildArgumentPrompt(context, { compactRetry: true })

    expect(basePrompt).not.toContain('最多返回 4 条 Argument')
    expect(retryPrompt).toContain('最多返回 4 条 Argument')
    for (const field of ['position', 'reasoning', 'counter_argument', 'response', 'risk', 'conclusion']) {
      expect(retryPrompt).toContain(field)
    }
  })
})
