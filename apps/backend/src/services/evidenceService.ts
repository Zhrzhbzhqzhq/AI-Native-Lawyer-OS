import type { PrismaClient } from '@lawdesk/database';
import EvidenceRepository from '../repositories/evidenceRepository';

export class EvidenceService {
  repo: EvidenceRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new EvidenceRepository(prisma);
  }

  listByMatter(matter_id: string) {
    return this.repo.findByMatterId(matter_id);
  }

  createForMatter(matter_id: string, data: { evidence_id: string; material_id: string; title: string; evidence_type?: string; description?: string; relevance?: string; status?: string }) {
    const payload = { ...data, matter_id } as any;
    return this.repo.create(payload as any);
  }
}

export default EvidenceService;
