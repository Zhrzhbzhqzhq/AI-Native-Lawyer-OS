import { describe, expect, it, vi } from 'vitest'
import DirectMiniMaxBenchmarkProvider from '../../src/services/case-intelligence/adapters/DirectMiniMaxBenchmarkProvider'
import { mockCaseModel } from './caseModel.fixture'

const input = {
  case_id: 'case-006',
  title: '股权转让合同纠纷',
  context: [{ title: '合同', content: '双方签订股权转让合同。' }],
}

describe('DirectMiniMaxBenchmarkProvider', () => {
  it.each([
    ['response.response.choices', (content: string) => ({
      response: { response: { choices: [{ message: { content } }] } },
    })],
    ['response.choices', (content: string) => ({
      response: { choices: [{ message: { content } }] },
    })],
    ['choices', (content: string) => ({
      choices: [{ message: { content } }],
    })],
  ])('extracts CaseModel JSON from %s', async (_name, responseOf) => {
    const model = mockCaseModel()
    const generator = {
      generate: vi.fn().mockResolvedValue(responseOf(JSON.stringify(model))),
    }

    await expect(new DirectMiniMaxBenchmarkProvider(generator).generateCaseModel(input))
      .resolves.toEqual(model)
  })

  it('extracts CaseModel JSON from a Markdown JSON block', async () => {
    const model = mockCaseModel()
    const content = `\`\`\`json\n${JSON.stringify(model)}\n\`\`\``
    const generator = {
      generate: vi.fn().mockResolvedValue({ choices: [{ message: { content } }] }),
    }

    await expect(new DirectMiniMaxBenchmarkProvider(generator).generateCaseModel(input))
      .resolves.toEqual(model)
  })

  it('generates a complete CaseModel from a direct MiniMax JSON response', async () => {
    const model = mockCaseModel()
    const generator = { generate: vi.fn().mockResolvedValue({
      response: { choices: [{ message: { content: `\`\`\`json\n${JSON.stringify(model)}\n\`\`\`` }, finish_reason: 'stop' }] },
    }) }

    await expect(new DirectMiniMaxBenchmarkProvider(generator).generateCaseModel(input)).resolves.toEqual(model)
    expect(generator.generate.mock.calls[0][0]).toMatchObject({
      provider: 'minimax',
      model: 'MiniMax-M3',
      prompt_version: 'case-intelligence-direct-benchmark-v2',
      task: 'case_intelligence_direct_benchmark',
      max_completion_tokens: 6000,
    })
    expect(generator.generate.mock.calls[0][0].user_prompt).toContain('"additionalProperties":false')
    expect(generator.generate.mock.calls[0][0].user_prompt).toContain('"enum":["confirmed","disputed","unknown"]')
    expect(generator.generate.mock.calls[0][0].user_prompt).toContain('材料明确金额')
    expect(generator.generate.mock.calls[0][0].user_prompt).toContain('根据材料计算金额')
    expect(generator.generate.mock.calls[0][0].user_prompt).toContain('不得将计算结果表述为材料直接记载的事实')
    expect(generator.generate.mock.calls[0][0].user_prompt).toContain('付款性质存在争议时，不得直接扣减并计算剩余本金')
    expect(generator.generate.mock.calls[0][0].user_prompt).toContain('禁止输出未确认性质的付款扣减后的余额或任何推测性的债务余额')
    expect(generator.generate.mock.calls[0][0].user_prompt).toContain('将争议金额及付款性质争议写入 conflicts')
    expect(generator.generate.mock.calls[0][0].user_prompt).toContain('将金额不确定性写入 unknowns')
    expect(generator.generate.mock.calls[0][0].user_prompt).toContain('付款性质影响金额计算')
    expect(generator.generate.mock.calls[0][0].user_prompt).toContain('unknowns 字段禁止输出具体金额计算结果')
    expect(generator.generate.mock.calls[0][0].user_prompt).toContain('可以描述需要计算及本金、利率、计算期间等计算因素')
    expect(generator.generate.mock.calls[0][0].user_prompt).toContain('conflicts 和 decisionFactors 同样禁止输出未经确认的具体债务金额')
    expect(generator.generate.mock.calls[0][0].user_prompt).toContain('禁止写“若30万元为利息，则利息为6万元。”')
    expect(generator.generate.mock.calls[0][0].user_prompt).toContain('允许写“若30万元属于利息，需要根据本金、利率及计算期间进一步核算。”')
    expect(generator.generate.mock.calls[0][0].user_prompt).toContain('必须在 unknowns 中输出对应的 unknown 项')
    expect(generator.generate.mock.calls[0][0].user_prompt).toContain('禁止依据常识')
    expect(generator.generate).toHaveBeenCalledTimes(1)
  })

  it('evaluates the direct CaseModel against the Golden CaseModel without CaseChiefService', async () => {
    const model = mockCaseModel()
    const generator = { generate: vi.fn().mockResolvedValue({ response: model, finish_reason: 'stop' }) }

    const result = await new DirectMiniMaxBenchmarkProvider(generator).run(input, structuredClone(model))

    expect(result.model).toEqual(model)
    expect(result.evaluation).toMatchObject({ status: 'completed', score: 100 })
    expect(generator.generate).toHaveBeenCalledTimes(1)
  })

  it('does not retry after schema validation failure', async () => {
    const generator = { generate: vi.fn().mockResolvedValue({ response: { identity: {} }, finish_reason: 'stop' }) }

    await expect(new DirectMiniMaxBenchmarkProvider(generator).generateCaseModel(input))
      .rejects.toMatchObject({ code: 'direct_minimax_schema_validation_failed' })
    expect(generator.generate).toHaveBeenCalledTimes(1)
  })

  it('normalizes Direct MiniMax output before schema validation', async () => {
    const model: any = mockCaseModel()
    model.timeline[0].certainty = '已确认'
    model.decisionFactors[0].impact = '重要'
    model.risks[0].severity = '中'
    model.unknowns[0].importance = '高'
    model.selfReview.confidence = 72
    model.selfReview.limitations = '材料有限'
    model.selfReview.assumptions = '仅基于输入材料'
    const generator = { generate: vi.fn().mockResolvedValue({ response: model, finish_reason: 'stop' }) }

    await expect(new DirectMiniMaxBenchmarkProvider(generator).generateCaseModel(input)).resolves.toMatchObject({
      timeline: [{ certainty: 'confirmed' }],
      decisionFactors: [{ impact: 'uncertain' }],
      risks: [{ severity: 'medium' }],
      unknowns: [{ importance: 'high' }],
      selfReview: {
        confidence: 0.72,
        limitations: ['材料有限'],
        assumptions: ['仅基于输入材料'],
      },
    })
  })

  it('exposes raw response and validation diagnostics after a single failed response', async () => {
    const records: unknown[] = []
    const raw = { response: { identity: {} }, finish_reason: 'stop' }
    const generator = { generate: vi.fn().mockResolvedValue(raw) }
    const provider = new DirectMiniMaxBenchmarkProvider(generator, { onResponse: (record) => records.push(record) })

    await expect(provider.generateCaseModel(input)).rejects.toMatchObject({
      code: 'direct_minimax_schema_validation_failed',
      failingStage: 'direct_case_model',
      rawAIResponse: raw,
      provider: 'minimax',
      model: 'MiniMax-M3',
    })
    expect(records).toHaveLength(1)
  })
})
