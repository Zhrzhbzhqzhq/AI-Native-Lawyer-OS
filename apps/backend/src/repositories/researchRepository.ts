import type { PrismaClient } from '@lawdesk/database';

export class ResearchRepository {
  prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByMatterId(matter_id: string) {
    return this.prisma.knowledge.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } });
  }

  async create(data: {
    research_id: string;
    matter_id: string;
    research_type?: string;
    title: string;
    query?: string;
    summary?: string;
    source?: string;
    result_url?: string;
    status?: string;
  }) {
    const payload = {
      knowledge_id: data.research_id,
      matter_id: data.matter_id,
      title: data.title,
      category: data.research_type ?? '',
      content_uri: data.result_url ?? '',
      source: data.source ?? '',
      version: data.summary ?? '',
      status: data.status ?? 'recorded',
    };
    return this.prisma.knowledge.create({ data: payload as any });
  }

  async deleteByResearchId(research_id: string) {
    return this.prisma.knowledge.delete({ where: { knowledge_id: research_id } });
  }
}

export default ResearchRepository;
