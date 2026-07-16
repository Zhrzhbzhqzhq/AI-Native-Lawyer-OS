import { describe, it, expect, vi, afterEach } from 'vitest'
import DocumentPipeline from '../src/services/ai/DocumentPipeline'
import DocumentDraftService from '../src/services/documentDraftService'

const fakePrisma: any = {}

describe('DocumentPipeline', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('delegates to Document Draft workflow instead of creating formal documents', async () => {
    const spy = vi.spyOn(DocumentDraftService.prototype, 'generateDraft').mockResolvedValue({
      status: 'document_draft_ready',
      idempotent: false,
      document_draft: { id: 'draft-1' } as any,
    })

    const pipeline = new DocumentPipeline(fakePrisma as any)
    const res = await pipeline.run('m-1')

    expect(spy).toHaveBeenCalledWith('m-1', 'complaint')
    expect(res.success).toBe(true)
    expect(res.documentDraftId).toBe('draft-1')
    expect(res.draftDocumentId).toBe('draft-1')
  })

  it('propagates draft generation errors', async () => {
    vi.spyOn(DocumentDraftService.prototype, 'generateDraft').mockRejectedValue(new Error('formal_arguments_required'))
    const pipeline = new DocumentPipeline(fakePrisma as any)
    await expect(pipeline.run('m-2')).rejects.toThrow('formal_arguments_required')
  })
})
