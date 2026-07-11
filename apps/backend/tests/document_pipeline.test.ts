import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import DocumentPipeline from '../src/services/ai/DocumentPipeline'
import MatterContextBuilder from '../src/services/ai/context/MatterContextBuilder'
import PromptRunner from '../src/services/ai/PromptRunner'
import DocumentService from '../src/services/documentService'

const fakePrisma: any = {}

describe('DocumentPipeline', () => {
    let buildSpy: any
    let promptSpy: any
    let docCreateSpy: any

    beforeEach(() => {
        buildSpy = vi.spyOn(MatterContextBuilder.prototype, 'build')
        promptSpy = vi.spyOn(PromptRunner.prototype, 'run')
        docCreateSpy = vi.spyOn(DocumentService.prototype, 'createDocument')
    })
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('successfully creates a draft document', async () => {
        buildSpy.mockResolvedValue({ matter: { matter_id: 'm-1' } })
        promptSpy
            .mockResolvedValueOnce({ text: 'analysis text', provider: 'p', model: 'm' })
            .mockResolvedValueOnce({ text: JSON.stringify([{ title: '起诉状', document_type: '起诉状', content: '正文'.repeat(100) }]), provider: 'p', model: 'm' })
        docCreateSpy.mockResolvedValue({ document_id: 'doc-1' })

        const p = new DocumentPipeline(fakePrisma as any)
        const res = await p.run('m-1')
        expect(res.success).toBe(true)
        expect(res.draftDocumentId).toBe('doc-1')
        expect(res.provider).toBe('p')
    })

    it('throws matter_not_found when matter missing', async () => {
        buildSpy.mockResolvedValue({ matter: null })
        const p = new DocumentPipeline(fakePrisma as any)
        await expect(p.run('m-x')).rejects.toThrow('matter_not_found')
    })

    it('propagates PromptRunner errors', async () => {
        buildSpy.mockResolvedValue({ matter: { matter_id: 'm-2' } })
        promptSpy.mockRejectedValue(new Error('ai_service_error: boom'))
        const p = new DocumentPipeline(fakePrisma as any)
        await expect(p.run('m-2')).rejects.toThrow(/ai_service_error/)
    })

    it('throws draft_save_failed when saving fails', async () => {
        buildSpy.mockResolvedValue({ matter: { matter_id: 'm-3' } })
        promptSpy
            .mockResolvedValueOnce({ text: 'analysis', provider: 'p', model: 'm' })
            .mockResolvedValueOnce({ text: JSON.stringify([{ title: '起诉状', document_type: '起诉状', content: '正文' }]), provider: 'p', model: 'm' })
        docCreateSpy.mockRejectedValue(new Error('db fail'))

        const p = new DocumentPipeline(fakePrisma as any)
        await expect(p.run('m-3')).rejects.toThrow(/draft_save_failed/)
    })
})
