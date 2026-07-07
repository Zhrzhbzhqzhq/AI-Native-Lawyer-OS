import type { PrismaClient } from '@lawdesk/database';

export class FactRepository {
    prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async create(data: { fact_id: string; matter_id: string; title: string; description?: string; status?: string }) {
        const payload = {
            fact_id: data.fact_id,
            matter_id: data.matter_id,
            title: data.title,
            description: data.description ?? '',
            status: data.status ?? 'draft',
        };
        return (this.prisma as any).fact.create({ data: payload as any });
    }

    async listByMatter(matter_id: string) {
        return (this.prisma as any).fact.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' }, select: { fact_id: true, matter_id: true, title: true, description: true, status: true, created_at: true, updated_at: true } });
    }

    async getByFactId(fact_id: string) {
        return (this.prisma as any).fact.findFirst({ where: { fact_id }, select: { fact_id: true, matter_id: true, title: true, description: true, status: true, created_at: true, updated_at: true } });
    }

    async update(fact_id: string, patch: Partial<any>) {
        const existing = await (this.prisma as any).fact.findFirst({ where: { fact_id } });
        if (!existing) throw new Error('Not found');
        return (this.prisma as any).fact.update({ where: { fact_id }, data: patch as any, select: { fact_id: true, matter_id: true, title: true, description: true, status: true, created_at: true, updated_at: true } });
    }

    async delete(fact_id: string) {
        const existing = await (this.prisma as any).fact.findFirst({ where: { fact_id } });
        if (!existing) throw new Error('Not found');
        return (this.prisma as any).fact.delete({ where: { fact_id } });
    }
}

export default FactRepository;
