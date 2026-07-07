import type { PrismaClient } from '@lawdesk/database';

export class EvidenceRepository {
  prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByMatterId(matter_id: string) {
    return this.prisma.evidence.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } });
  }

  async create(data: {
    evidence_id: string;
    matter_id: string;
    material_id: string;
    title: string;
    evidence_type?: string;
    description?: string;
    relevance?: string;
    status?: string;
  }) {
    const payload = {
      evidence_id: data.evidence_id,
      matter_id: data.matter_id,
      material_id: data.material_id,
      title: data.title,
      evidence_type: data.evidence_type ?? '',
      description: data.description ?? '',
      relevance: data.relevance ?? '',
      status: data.status ?? 'active',
    };
    return this.prisma.evidence.create({ data: payload as any });
  }

  async updateDescriptionByEvidenceId(evidence_id: string, description: string) {
    return this.prisma.evidence.update({
      where: { evidence_id },
      data: { description },
    });
  }

  async updateStatusByEvidenceId(evidence_id: string, status: string) {
    return this.prisma.evidence.update({
      where: { evidence_id },
      data: { status },
    });
  }
}

export default EvidenceRepository;
