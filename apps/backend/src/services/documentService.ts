import type { PrismaClient } from '@lawdesk/database';
import DocumentRepository from '../repositories/documentRepository';

export class DocumentService {
  repo: DocumentRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new DocumentRepository(prisma);
  }

  listByMatter(matter_id: string) {
    return this.repo.findByMatterId(matter_id);
  }

  createForMatter(matter_id: string, data: { document_id: string; title: string; document_type?: string; content_uri?: string; version?: string; status?: string; material_id?: string | null; evidence_id?: string | null }) {
    const payload = { ...data, matter_id } as any;
    return this.repo.create(payload as any);
  }

  deleteByDocumentId(document_id: string) {
    return this.repo.deleteByDocumentId(document_id);
  }
}

export default DocumentService;
