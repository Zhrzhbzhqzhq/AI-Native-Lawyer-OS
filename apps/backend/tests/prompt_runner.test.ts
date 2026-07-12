import { test, expect } from 'vitest'
import PromptRunner from '../src/services/ai/PromptRunner'

test('PromptRunner injects context into evidence prompt', async () => {
    const runner: any = new PromptRunner({} as any)
    // stub contextBuilder.build
    const fakeContext = {
        matter: { matter_id: 'm-1', title: 'Test Matter' },
        client: { name: 'Client A' },
        materials: [{ title: 'mat1' }],
        evidence: [{ title: 'Evidence A' }],
        research: [],
        documents: []
    }
    runner.contextBuilder.build = async (_: string) => fakeContext

    // stub adapter
    const adapter: any = {}
    let captured: any = null
    adapter.generate = async (pack: any) => { captured = pack; return { response: '[]', provider: 'mock', model: 'mock' } }
    (runner as any).aiService = { adapter }

    await runner.run({ matterId: 'm-1', promptType: 'evidence' })
    expect(captured).toBeTruthy()
    expect(typeof captured.user_prompt).toBe('string')
    expect(captured.user_prompt).toContain('Evidence:')
    expect(captured.user_prompt).toContain('Evidence A')
})

test('PromptRunner injects context into research prompt', async () => {
    const runner: any = new PromptRunner({} as any)
    const fakeContext = {
        matter: { matter_id: 'm-2', title: 'Matter Two' },
        client: null,
        materials: [{ title: 'mat2' }],
        evidence: [{ title: 'Evidence B' }],
        research: [],
        documents: []
    }
    runner.contextBuilder.build = async (_: string) => fakeContext
    const adapter: any = {}
    let captured: any = null
    adapter.generate = async (pack: any) => { captured = pack; return { response: '[]', provider: 'mock', model: 'mock' } }
    (runner as any).aiService = { adapter }

    await runner.run({ matterId: 'm-2', promptType: 'research' })
    expect(captured).toBeTruthy()
    expect(captured.user_prompt).toContain('Matter:')
    expect(captured.user_prompt).toContain('Matter Two')
    expect(captured.user_prompt).toContain('Materials:')
    expect(captured.user_prompt).toContain('Evidence B')
})

test('PromptRunner injects analysis and context into document prompt', async () => {
    const runner: any = new PromptRunner({} as any)
    const fakeContext = {
        matter: { matter_id: 'm-3', title: 'Matter Three' },
        client: null,
        materials: [],
        evidence: [{ title: 'Evidence C' }],
        research: [{ title: 'Fact 1' }],
        documents: []
    }
    runner.contextBuilder.build = async (_: string) => fakeContext
    const adapter: any = {}
    let captured: any = null
    adapter.generate = async (pack: any) => { captured = pack; return { response: '[]', provider: 'mock', model: 'mock' } }
    (runner as any).aiService = { adapter }

    const analysisText = '这是分析结果：若干事实摘要'
    await runner.run({ matterId: 'm-3', promptType: 'document', systemPrompt: analysisText })
    expect(captured).toBeTruthy()
    expect(captured.user_prompt).toContain('Analysis:')
    expect(captured.user_prompt).toContain('这是分析结果')
    expect(captured.user_prompt).toContain('Matter Three')
    expect(captured.user_prompt).toContain('Evidence C')
})
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import PromptRunner from '../src/services/ai/PromptRunner'
import MatterContextBuilder from '../src/services/ai/context/MatterContextBuilder'
import AIService from '../src/services/ai/AIService'

const fakePrisma: any = {}

describe('PromptRunner', () => {
    let buildSpy: any
    beforeEach(() => {
        buildSpy = vi.spyOn(MatterContextBuilder.prototype, 'build')
    })
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('runs evidence prompt and calls AI adapter once', async () => {
        buildSpy.mockResolvedValue({ matter: { matter_id: 'm-1' }, materials: [], evidence: [], research: [], documents: [] })
        const runner = new PromptRunner(fakePrisma as any)
        // stub adapter
        const fakeAdapter = { generate: vi.fn().mockResolvedValue({ provider: 'minimax', model: 'm-test', response: { choices: [{ message: { content: 'EVIDENCE_OK' } }] } }) }
            ; (runner as any).aiService.adapter = fakeAdapter

        const out = await runner.run({ matterId: 'm-1', promptType: 'evidence' })
        expect(out.text).toBe('EVIDENCE_OK')
        expect(out.provider).toBe('minimax')
        expect(out.model).toBe('m-test')
        expect(buildSpy).toHaveBeenCalledTimes(1)
        expect(fakeAdapter.generate).toHaveBeenCalledTimes(1)
    })

    it('runs research prompt and calls AI adapter once', async () => {
        buildSpy.mockResolvedValue({ matter: { matter_id: 'm-2' }, materials: [], evidence: [], research: [], documents: [] })
        const runner = new PromptRunner(fakePrisma as any)
        const fakeAdapter = { generate: vi.fn().mockResolvedValue({ provider: 'minimax', model: 'm-r', response: { choices: [{ message: { content: 'RESEARCH_OK' } }] } }) }
            ; (runner as any).aiService.adapter = fakeAdapter

        const out = await runner.run({ matterId: 'm-2', promptType: 'research' })
        expect(out.text).toBe('RESEARCH_OK')
        expect(out.provider).toBe('minimax')
        expect(out.model).toBe('m-r')
        expect(buildSpy).toHaveBeenCalledTimes(1)
        expect(fakeAdapter.generate).toHaveBeenCalledTimes(1)
    })

    it('throws matter_not_found when matter missing', async () => {
        buildSpy.mockResolvedValue({ matter: null, materials: [], evidence: [], research: [], documents: [] })
        const runner = new PromptRunner(fakePrisma as any)
        await expect(runner.run({ matterId: 'm-x', promptType: 'evidence' })).rejects.toThrow('matter_not_found')
        expect(buildSpy).toHaveBeenCalledTimes(1)
    })

    it('throws unsupported_prompt_type for unknown type', async () => {
        buildSpy.mockResolvedValue({ matter: { matter_id: 'm-3' }, materials: [], evidence: [], research: [], documents: [] })
        const runner = new PromptRunner(fakePrisma as any)
        // @ts-ignore
        await expect(runner.run({ matterId: 'm-3', promptType: 'documents' })).rejects.toThrow('unsupported_prompt_type')
    })

    it('wraps adapter errors as business error', async () => {
        buildSpy.mockResolvedValue({ matter: { matter_id: 'm-4' }, materials: [], evidence: [], research: [], documents: [] })
        const runner = new PromptRunner(fakePrisma as any)
        const fakeAdapter = { generate: vi.fn().mockRejectedValue(new Error('adapter boom')) }
            ; (runner as any).aiService.adapter = fakeAdapter
        await expect(runner.run({ matterId: 'm-4', promptType: 'evidence' })).rejects.toThrow(/ai_service_error/)
        expect(fakeAdapter.generate).toHaveBeenCalledTimes(1)
    })
})
