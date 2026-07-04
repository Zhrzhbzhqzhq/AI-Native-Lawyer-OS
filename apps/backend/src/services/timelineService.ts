import type { PrismaClient } from '@lawdesk/database';
import TimelineRepository from '../repositories/timelineRepository';

export class TimelineService {
  repo: TimelineRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new TimelineRepository(prisma);
  }

  listByMatter(matter_id: string) {
    return this.repo.findByMatterId(matter_id);
  }

  createForMatter(matter_id: string, data: { timeline_id: string; event_type: string; event_time: string | Date; description?: string; source?: string; }) {
    const payload = { ...data, matter_id };
    return this.repo.create(payload as any);
  }
}

export default TimelineService;
