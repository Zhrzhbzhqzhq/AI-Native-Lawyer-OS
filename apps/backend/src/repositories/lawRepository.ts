import type { PrismaClient } from '@lawdesk/database';

export class LawRepository {
    prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async create(data: { law_id: string; matter_id: string; issue_id?: string; title: string; citation?: string; description?: string; status?: string }) {
        const payload = {
            law_id: data.law_id,
            matter_id: data.matter_id,
            issue_id: data.issue_id ?? null,
            title: data.title,
            citation: data.citation ?? '',
            description: data.description ?? '',
            status: data.status ?? 'draft',
        };
        return this.prisma.law.create({ data: payload as any });
    }

    async listByMatter(matter_id: string) {
        return this.prisma.law.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' }, select: { law_id: true, matter_id: true, issue_id: true, title: true, citation: true, description: true, status: true, created_at: true, updated_at: true } });
    }

    async getByLawId(law_id: string) {
        return this.prisma.law.findFirst({ where: { law_id }, select: { law_id: true, matter_id: true, issue_id: true, title: true, citation: true, description: true, status: true, created_at: true, updated_at: true } });
    }

    async update(law_id: string, patch: Partial<any>) {
        const existing = await this.prisma.law.findFirst({ where: { law_id } });
        if (!existing) throw new Error('Not found');
        return this.prisma.law.update({ where: { law_id }, data: patch as any, select: { law_id: true, matter_id: true, issue_id: true, title: true, citation: true, description: true, status: true, created_at: true, updated_at: true } });
    }

    async delete(law_id: string) {
        const existing = await this.prisma.law.findFirst({ where: { law_id } });
        if (!existing) throw new Error('Not found');
        return this.prisma.law.delete({ where: { law_id } });
    }
}

export default LawRepository;
