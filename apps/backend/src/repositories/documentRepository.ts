import type { PrismaClient } from '@lawdesk/database';

export class DocumentRepository {
  prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByMatterId(matter_id: string) {
    return this.prisma.document.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } });
  }

  async create(data: {
    document_id: string;
    matter_id: string;
    title: string;
    document_type?: string;
    content_uri?: string;
    version?: string;
    status?: string;
    material_id?: string | null;
    evidence_id?: string | null;
  }) {
    const payload = {
      document_id: data.document_id,
      matter_id: data.matter_id,
      title: data.title,
      document_type: data.document_type ?? '',
      content_uri: data.content_uri ?? '',
      version: data.version ?? '',
      status: data.status ?? 'draft',
      material_id: data.material_id ?? null,
      evidence_id: data.evidence_id ?? null,
    };
    return this.prisma.document.create({ data: payload as any });
  }

  async deleteByDocumentId(document_id: string) {
    return this.prisma.document.delete({ where: { document_id } });
  }
}

export default DocumentRepository;
