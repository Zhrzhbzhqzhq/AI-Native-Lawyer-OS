import type { PrismaClient } from '@lawdesk/database';
import MatterService from './matterService';
import TimelineService from './timelineService';

export class MatterContextService {
  prisma: PrismaClient;
  matterService: MatterService;
  timelineService: TimelineService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.matterService = new MatterService(prisma);
    this.timelineService = new TimelineService(prisma);
  }

  async buildContext(matter_id: string) {
    const matter = await this.matterService.get(matter_id);
    if (!matter) throw new Error('Not found');

    const [timeline, materials, evidence, research, documents, tasks, conversation] = await Promise.all([
      this.timelineService.listByMatter(matter_id),
      this.prisma.material.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } }),
      this.prisma.evidence.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } }),
      this.prisma.knowledge.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } }),
      this.prisma.document.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } }),
      this.prisma.task.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } }),
      this.prisma.aiRecord.findMany({ where: { matter_id, ai_task_type: 'conversation' }, orderBy: { created_at: 'asc' } }),
    ]);

    return {
      matter,
      timeline,
      materials,
      evidence,
      research,
      documents,
      tasks,
      conversation,
      generated_at: new Date().toISOString(),
    } as const;
  }
}

export default MatterContextService;
