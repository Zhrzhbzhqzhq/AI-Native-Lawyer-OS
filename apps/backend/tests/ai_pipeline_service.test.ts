import { afterEach, describe, expect, it, vi } from 'vitest'
import ProviderManager from '../src/ai/providerManager'
import AIPipelineService from '../src/services/ai/AIPipelineService'

function mockAdapterWithResponses(responses: any[]) {
    let index = 0
    vi.spyOn(ProviderManager, 'getAdapter').mockReturnValue({
        generate: vi.fn(async () => responses[index++] ?? { response: '[]' }),
    } as any)
}

function jsonResponse(value: any) {
    return {
        response: JSON.stringify(value),
        ai_audit: { provider: 'mock', model: 'mock-lawdesk-v1', prompt_version: 'test-v1', fallback_used: false },
    }
}

describe('AIPipelineService evidence normalization', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('does not turn generic mock summary objects into evidence', async () => {
        mockAdapterWithResponses([
            {
                response: {
                    summary: 'Mock summary for matter unknown',
                    risks: [],
                    missing_items: [],
                    next_steps: [{ title: 'Assign investigator to collect bank records' }],
                },
            },
            jsonResponse(['fact']),
            jsonResponse(['issue']),
            jsonResponse(['law']),
            jsonResponse(['argument']),
            jsonResponse([{ type: 'memo', content: 'content' }]),
        ])

        const result = await new AIPipelineService().run('case summary')

        expect(result.steps.evidence).toEqual([])
        expect(result.steps.facts).toEqual(['fact'])
    })

    it('does not use JSON source text as an evidence title', async () => {
        mockAdapterWithResponses([
            jsonResponse(['{"summary":"Mock summary for matter unknown","risks":[]}']),
            jsonResponse(['fact']),
            jsonResponse(['issue']),
            jsonResponse(['law']),
            jsonResponse(['argument']),
            jsonResponse([{ type: 'memo', content: 'content' }]),
        ])

        const result = await new AIPipelineService().run('case summary')

        expect(result.steps.evidence).toEqual([])
    })

    it('keeps valid evidence arrays', async () => {
        mockAdapterWithResponses([
            jsonResponse([
                { title: '银行转账记录', description: '证明借款交付', evidence_type: 'bank_record' },
                '微信聊天记录',
            ]),
            jsonResponse(['fact']),
            jsonResponse(['issue']),
            jsonResponse(['law']),
            jsonResponse(['argument']),
            jsonResponse([{ type: 'memo', content: 'content' }]),
        ])

        const result = await new AIPipelineService().run('case summary')

        expect(result.steps.evidence).toEqual([
            { title: '银行转账记录', description: '证明借款交付', evidence_type: 'bank_record' },
            { title: '微信聊天记录' },
        ])
        expect(result.ai_audits).toHaveLength(6)
        expect(result.provider).toBe('mock')
        expect(result.model).toBe('mock-lawdesk-v1')
        expect(result.fallback_used).toBe(false)
    })

    it('returns empty evidence when parsing fails', async () => {
        mockAdapterWithResponses([
            { response: 'not json evidence' },
            jsonResponse(['fact']),
            jsonResponse(['issue']),
            jsonResponse(['law']),
            jsonResponse(['argument']),
            jsonResponse([{ type: 'memo', content: 'content' }]),
        ])

        const result = await new AIPipelineService().run('case summary')

        expect(result.steps.evidence).toEqual([])
    })

    it('keeps non-evidence step fallback behavior unchanged', async () => {
        mockAdapterWithResponses([
            jsonResponse([{ title: '借条' }]),
            { response: 'raw fact text' },
            { response: 'raw issue text' },
            { response: 'raw law text' },
            { response: 'raw argument text' },
            { response: 'raw document text' },
        ])

        const result = await new AIPipelineService().run('case summary')

        expect(result.steps.facts).toEqual(['raw fact text'])
        expect(result.steps.issues).toEqual(['raw issue text'])
        expect(result.steps.laws).toEqual(['raw law text'])
        expect(result.steps.arguments).toEqual(['raw argument text'])
        expect(result.steps.documents).toEqual([{ type: 'raw', content: 'raw document text' }])
    })
})
