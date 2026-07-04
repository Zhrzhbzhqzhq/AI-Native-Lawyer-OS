import type { PrismaClient } from '@lawdesk/database';

export class TimelineRepository {
  prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByMatterId(matter_id: string) {
    const rows = await this.prisma.timeline.findMany({ where: { matter_id }, orderBy: { event_time: 'desc' } });
    // eslint-disable-next-line no-console
    console.log('[TimelineRepository] findByMatterId', { matter_id, count: rows.length });
    return rows;
  }

  async create(data: {
    timeline_id: string;
    matter_id: string;
    event_type: string;
    event_time: string | Date;
    description?: string;
    source?: string;
    status?: string;
  }) {
    const payload = {
      timeline_id: data.timeline_id,
      matter_id: data.matter_id,
      event_type: data.event_type,
      event_time: new Date(data.event_time),
      description: data.description ?? '',
      source: data.source ?? '',
      status: data.status ?? 'recorded',
    };
    try {
      const created = await this.prisma.timeline.create({ data: payload as any });
      // debug log to diagnose missing timeline entries in production validation
      // (intentionally minimal and safe for production)
      // eslint-disable-next-line no-console
      console.debug('[TimelineRepository] created', { timeline_id: created.timeline_id, matter_id: created.matter_id });
      return created;
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[TimelineRepository] create failed', err && (err.message || String(err)));
      throw err;
    }
  }
}

export default TimelineRepository;
