import type { PrismaClient } from '@lawdesk/database';

// Derive the correct update `data` type for Matter from the PrismaClient shape
type MatterUpdateData = Parameters<PrismaClient['matter']['update']>[0]['data'];

export class MatterRepository {
  prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findAll() {
    return this.prisma.matter.findMany({ where: { status: { not: 'deleted' } }, orderBy: { created_at: 'desc' } });
  }

  async findByMatterId(matter_id: string) {
    return this.prisma.matter.findFirst({ where: { matter_id, status: { not: 'deleted' } } });
  }

  async create(data: {
    matter_id: string;
    title: string;
    description?: string;
    matter_type?: string;
    status?: string;
  }) {
    const payload = {
      matter_id: data.matter_id,
      title: data.title,
      description: data.description ?? '',
      matter_type: data.matter_type ?? '',
      status: data.status ?? 'active',
    };
    return this.prisma.matter.create({ data: payload as any });
  }

  async updateByMatterId(matter_id: string, patch: MatterUpdateData) {
    // Check existence first to return a predictable result
    const existing = await this.prisma.matter.findFirst({ where: { matter_id } });
    if (!existing) {
      throw new Error('Not found')
    }
    return this.prisma.matter.update({ where: { matter_id }, data: patch as any });
  }

  async softDelete(matter_id: string) {
    return this.prisma.matter.update({ where: { matter_id }, data: { status: 'deleted' } });
  }
}

export default MatterRepository;
