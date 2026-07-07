import type { PrismaClient } from '@lawdesk/database';

export class IssueFactRepository {
    prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async attachFact(issue_id: string, fact_id: string, note?: string): Promise<any> {
        const existing = await this.prisma.issueFact.findFirst({ where: { issue_id, fact_id } });
        if (existing) return existing;
        const created = await this.prisma.issueFact.create({ data: { issue_id, fact_id, note: note ?? '' } });
        return created;
    }

    async detachFact(issue_id: string, fact_id: string): Promise<{ count: number }> {
        const res = await this.prisma.issueFact.deleteMany({ where: { issue_id, fact_id } });
        return res;
    }

    async listFacts(issue_id: string): Promise<any[]> {
        return this.prisma.issueFact.findMany({ where: { issue_id }, include: { fact: { select: { fact_id: true, title: true, description: true, status: true, created_at: true, updated_at: true } } }, orderBy: { created_at: 'desc' } });
    }
}

export default IssueFactRepository;
