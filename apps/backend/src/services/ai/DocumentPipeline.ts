import type { PrismaClient } from '@lawdesk/database'
import DocumentDraftService from '../documentDraftService'

export default class DocumentPipeline {
    documentDraftService: DocumentDraftService

    constructor(prisma: PrismaClient) {
        this.documentDraftService = new DocumentDraftService(prisma)
    }

    async run(matterId: string) {
        const result = await this.documentDraftService.generateDraft(matterId, 'complaint')
        return {
            success: true,
            documentDraftId: result.document_draft.id,
            draftDocumentId: result.document_draft.id,
            idempotent: result.idempotent,
            provider: 'local',
            model: 'document-draft-workflow-v1',
        }
    }
}
