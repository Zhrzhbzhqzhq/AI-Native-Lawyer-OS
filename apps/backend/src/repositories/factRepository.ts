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
        return this.prisma.fact.create({ data: payload as any });
    }

    async listByMatter(matter_id: string) {
        return this.prisma.fact.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' }, select: { fact_id: true, matter_id: true, title: true, description: true, status: true, created_at: true, updated_at: true } });
    }

    async getByFactId(fact_id: string) {
        return this.prisma.fact.findFirst({ where: { fact_id }, select: { fact_id: true, matter_id: true, title: true, description: true, status: true, created_at: true, updated_at: true } });
    }

    async update(fact_id: string, patch: Partial<any>) {
        const existing = await this.prisma.fact.findFirst({ where: { fact_id } });
        if (!existing) throw new Error('Not found');
        return this.prisma.fact.update({ where: { fact_id }, data: patch as any, select: { fact_id: true, matter_id: true, title: true, description: true, status: true, created_at: true, updated_at: true } });
    }

    async delete(fact_id: string) {
        const existing = await this.prisma.fact.findFirst({ where: { fact_id } });
        if (!existing) throw new Error('Not found');
        return this.prisma.fact.delete({ where: { fact_id } });
    }

    async attachEvidence(fact_id: string, evidence_id: string, note?: string): Promise<any> {
        // check existing
        const existing = await this.prisma.factEvidence.findFirst({ where: { fact_id, evidence_id } });
        if (existing) return existing;

        const created = await this.prisma.factEvidence.create({ data: { fact_id, evidence_id, note: note ?? '' } });
        return created;
    }

    async detachEvidence(fact_id: string, evidence_id: string): Promise<{ count: number }> {
        // delete any matching relation
        const res = await this.prisma.factEvidence.deleteMany({ where: { fact_id, evidence_id } });
        return res;
    }

    async listFactEvidence(fact_id: string): Promise<any[]> {
        return this.prisma.factEvidence.findMany({ where: { fact_id }, include: { evidence: { select: { evidence_id: true, title: true, evidence_type: true, description: true, status: true, created_at: true, updated_at: true } } }, orderBy: { created_at: 'desc' } });
    }
}

export default FactRepository;
