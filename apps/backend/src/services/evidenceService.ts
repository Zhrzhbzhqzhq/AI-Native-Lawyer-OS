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

  async updateDescription(matter_id: string, evidence_id: string, description: string) {
    // verify existence and matter_id match by fetching the evidence first
    const existingList = await this.repo.findByMatterId(matter_id)
    const exists = Array.isArray(existingList) && existingList.some((e: any) => String(e.evidence_id) === String(evidence_id))
    if (!exists) throw new Error('evidence_not_found')

    return this.repo.updateDescriptionByEvidenceId(evidence_id, description)
  }

  async updateStatus(matter_id: string, evidence_id: string, status: string) {
    const allowed = ['active', 'pending', 'accepted', 'weak', 'rejected']
    if (!allowed.includes(String(status))) throw new Error('invalid_status')

    const existingList = await this.repo.findByMatterId(matter_id)
    const exists = Array.isArray(existingList) && existingList.some((e: any) => String(e.evidence_id) === String(evidence_id))
    if (!exists) throw new Error('evidence_not_found')

    return this.repo.updateStatusByEvidenceId(evidence_id, String(status))
  }
}

export default EvidenceService;
