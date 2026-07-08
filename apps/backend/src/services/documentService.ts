import type { PrismaClient } from '@lawdesk/database';
import DocumentRepository from '../repositories/documentRepository';

export class DocumentService {
  repo: DocumentRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new DocumentRepository(prisma);
  }

  listDocuments(matter_id: string) {
    return this.repo.listByMatter(matter_id);
  }

  // Backwards-compatible API
  listByMatter(matter_id: string) {
    return this.listDocuments(matter_id);
  }

  createDocument(matter_id: string, data: { document_id?: string; title: string; document_type?: string; content_uri?: string; content?: string; version?: string; status?: string; material_id?: string | null; evidence_id?: string | null; argument_id?: string | null }) {
    const document_id = String(data.document_id || `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
    const payload = { ...data, document_id, matter_id } as any;
    return this.repo.create(payload as any);
  }

  // Backwards-compatible API
  createForMatter(matter_id: string, data: any) {
    return this.createDocument(matter_id, data as any);
  }

  getDocument(document_id: string) {
    return this.repo.getByDocumentId(document_id);
  }

  updateDocument(document_id: string, patch: Partial<any>) {
    return this.repo.update(document_id, patch);
  }

  deleteDocument(document_id: string) {
    return this.repo.delete(document_id);
  }

  // Backwards-compatible API
  deleteByDocumentId(document_id: string) {
    return this.deleteDocument(document_id);
  }
}

export default DocumentService;
