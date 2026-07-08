import type { PrismaClient } from '@lawdesk/database';

export class DocumentRepository {
  prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async listByMatter(matter_id: string) {
    return this.prisma.document.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' }, select: { document_id: true, matter_id: true, title: true, document_type: true, status: true, version: true, content_uri: true, content: true, material_id: true, evidence_id: true, argument_id: true, created_at: true, updated_at: true } });
  }

  // Backwards-compatible alias used by other modules
  async findByMatterId(matter_id: string) {
    return this.listByMatter(matter_id);
  }

  async create(data: any) {
    const payload = {
      document_id: data.document_id,
      matter_id: data.matter_id,
      title: data.title,
      document_type: data.document_type ?? '',
      content_uri: data.content_uri ?? '',
      content: typeof data.content === 'string' ? data.content : null,
      version: data.version ?? '',
      status: data.status ?? 'draft',
      material_id: data.material_id ?? null,
      evidence_id: data.evidence_id ?? null,
      argument_id: data.argument_id ?? null,
    };
    return this.prisma.document.create({ data: payload as any });
  }

  async getByDocumentId(document_id: string) {
    return this.prisma.document.findFirst({ where: { document_id }, select: { document_id: true, matter_id: true, title: true, document_type: true, status: true, version: true, content_uri: true, content: true, material_id: true, evidence_id: true, argument_id: true, created_at: true, updated_at: true } });
  }

  async update(document_id: string, patch: Partial<any>) {
    const existing = await this.prisma.document.findFirst({ where: { document_id } });
    if (!existing) throw new Error('Not found');
    return this.prisma.document.update({ where: { document_id }, data: patch as any, select: { document_id: true, matter_id: true, title: true, document_type: true, status: true, version: true, content_uri: true, content: true, material_id: true, evidence_id: true, argument_id: true, created_at: true, updated_at: true } });
  }

  async delete(document_id: string) {
    const existing = await this.prisma.document.findFirst({ where: { document_id } });
    if (!existing) throw new Error('Not found');
    return this.prisma.document.delete({ where: { document_id } });
  }

  async deleteByDocumentId(document_id: string) {
    return this.prisma.document.delete({ where: { document_id } });
  }
}

export default DocumentRepository;
