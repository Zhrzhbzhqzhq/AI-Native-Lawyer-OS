import type { PrismaClient } from '@lawdesk/database'
import MatterContextBuilder from './context/MatterContextBuilder'
import PromptRunner from './PromptRunner'
import DocumentService from '../documentService'

export default class DocumentPipeline {
    prisma: PrismaClient
    contextBuilder: MatterContextBuilder
    promptRunner: PromptRunner
    documentService: DocumentService

    constructor(prisma: PrismaClient) {
        this.prisma = prisma
        this.contextBuilder = new MatterContextBuilder(prisma)
        this.promptRunner = new PromptRunner(prisma)
        this.documentService = new DocumentService(prisma)
    }

    async run(matterId: string) {
        // 1. Build matter context
        const context = await this.contextBuilder.build(matterId)
        if (!context || !context.matter) {
            throw new Error('matter_not_found')
        }

        // 2. Run research prompt to get analysis
        const analysis = await this.promptRunner.run({ matterId, promptType: 'research' })

        // 3. Run document prompt with analysis as systemPrompt
        const docResp = await this.promptRunner.run({ matterId, promptType: 'document', systemPrompt: analysis.text })

        // docResp.text expected to be a JSON array of documents
        let docs: any
        try {
            docs = typeof docResp.text === 'string' ? JSON.parse(docResp.text) : docResp.text
        } catch (e: any) {
            throw new Error('document_generation_error')
        }

        if (!Array.isArray(docs) || docs.length === 0) {
            throw new Error('document_generation_error')
        }

        // take first doc as draft
        const first = docs[0]
        try {
            const created = await this.documentService.createDocument(context.matter.matter_id, {
                title: String(first.title || 'Draft Document'),
                document_type: String(first.document_type || ''),
                content: String(first.content || ''),
                status: 'draft',
            })

            return { success: true, draftDocumentId: created.document_id, provider: docResp.provider, model: docResp.model }
        } catch (e: any) {
            throw new Error(`draft_save_failed${e && e.message ? `: ${e.message}` : ''}`)
        }
    }
}
