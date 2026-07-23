import { describe, expect, it, vi } from 'vitest'
import { CaseIntelligenceAIProvider } from '../src/services/case-intelligence/adapters/CaseIntelligenceAIProvider'
import { createCasePipelineContext } from '../src/services/case-intelligence/pipeline/CasePipelineContext'

const context = createCasePipelineContext({ case_id: 'case-1', title: '合同纠纷', context: [] })
const identity = { caseId: 'case-1', title: '合同纠纷', caseType: '合同纠纷', stage: '诉前', jurisdiction: '中国大陆' }

describe('CaseIntelligenceAIProvider', () => {
  it('parses JSON from the existing MiniMax response shape', async () => {
    const generator = { generate: vi.fn().mockResolvedValue({
      response: { choices: [{ message: { content: `\`\`\`json\n${JSON.stringify(identity)}\n\`\`\`` }, finish_reason: 'stop' }] },
    }) }
    await expect(new CaseIntelligenceAIProvider(generator).provide('identity', context)).resolves.toEqual(identity)
    expect(generator.generate).toHaveBeenCalledTimes(1)
    expect(generator.generate.mock.calls[0][0]).toMatchObject({
      provider: 'minimax',
      model: 'MiniMax-M3',
    })
  })

  it('retries once after a length response with the same context', async () => {
    const generator = { generate: vi.fn()
      .mockResolvedValueOnce({ response: { choices: [{ message: { content: '{' }, finish_reason: 'length' }] } })
      .mockResolvedValueOnce({ response: identity, finish_reason: 'stop' }) }
    await expect(new CaseIntelligenceAIProvider(generator).provide('identity', context)).resolves.toEqual(identity)
    expect(generator.generate).toHaveBeenCalledTimes(2)
    expect(generator.generate.mock.calls[0][0].context_pack).toBe(context)
    expect(generator.generate.mock.calls[1][0].context_pack).toBe(context)
    expect(generator.generate.mock.calls[1][0].user_prompt).toContain('唯一一次重试')
  })

  it('retries schema-invalid JSON and returns the valid retry', async () => {
    const generator = { generate: vi.fn()
      .mockResolvedValueOnce({ response: { caseId: 'case-1' }, finish_reason: 'stop' })
      .mockResolvedValueOnce({ response: identity, finish_reason: 'stop' }) }
    await expect(new CaseIntelligenceAIProvider(generator).provide('identity', context)).resolves.toEqual(identity)
    expect(generator.generate).toHaveBeenCalledTimes(2)
  })

  it('rejects after two invalid JSON responses without partial output', async () => {
    const generator = { generate: vi.fn().mockResolvedValue({ response: { choices: [{ message: { content: '{bad' }, finish_reason: 'stop' }] } }) }
    await expect(new CaseIntelligenceAIProvider(generator).provide('identity', context)).rejects.toMatchObject({ code: 'case_intelligence_json_parse_failed' })
    expect(generator.generate).toHaveBeenCalledTimes(2)
  })

  it('reports stage, schema error, raw response and provider metadata after validation failure', async () => {
    const records: unknown[] = []
    const raw = { response: { caseId: 'case-1' }, finish_reason: 'stop' }
    const generator = { generate: vi.fn().mockResolvedValue(raw) }
    const provider = new CaseIntelligenceAIProvider(generator, { onResponse: (record) => records.push(record) })

    await expect(provider.provide('identity', context)).rejects.toMatchObject({
      failingStage: 'identity',
      schemaValidationError: { code: 'case_intelligence_schema_validation_failed' },
      rawAIResponse: raw,
      provider: 'minimax',
      model: 'MiniMax-M3',
    })
    expect(records).toHaveLength(2)
  })
})
