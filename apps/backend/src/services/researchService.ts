import type { PrismaClient } from '@lawdesk/database';
import ResearchRepository from '../repositories/researchRepository';

export class ResearchService {
  repo: ResearchRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new ResearchRepository(prisma);
  }

  listByMatter(matter_id: string) {
    return this.repo.findByMatterId(matter_id);
  }

  createForMatter(matter_id: string, data: { research_id: string; research_type?: string; title: string; query?: string; summary?: string; source?: string; result_url?: string; status?: string }) {
    const payload = { ...data, matter_id } as any;
    return this.repo.create(payload as any);
  }

  deleteByResearchId(research_id: string) {
    return this.repo.deleteByResearchId(research_id);
  }
}

export default ResearchService;
