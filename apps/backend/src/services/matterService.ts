import type { PrismaClient } from '@lawdesk/database';
import MatterRepository from '../repositories/matterRepository';

export class MatterService {
  repo: MatterRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new MatterRepository(prisma);
  }

  list() {
    return this.repo.findAll();
  }

  get(matter_id: string) {
    return this.repo.findByMatterId(matter_id);
  }

  create(data: { matter_id: string; title: string; description?: string; matter_type?: string }) {
    const payload = { ...data, status: 'active' };
    return this.repo.create(payload as any);
  }

  update(matter_id: string, patch: Partial<any>) {
    return this.repo.updateByMatterId(matter_id, patch);
  }

  remove(matter_id: string) {
    return this.repo.softDelete(matter_id);
  }
}

export default MatterService;
