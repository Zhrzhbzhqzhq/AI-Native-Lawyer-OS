import type { PrismaClient } from '@lawdesk/database';

export class IssueRepository {
    prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async create(data: { issue_id: string; matter_id: string; title: string; description?: string; status?: string; priority?: string }) {
        const payload = {
            issue_id: data.issue_id,
            matter_id: data.matter_id,
            title: data.title,
            description: data.description ?? '',
            status: data.status ?? 'draft',
            priority: data.priority ?? 'medium',
        };
        return this.prisma.issue.create({ data: payload as any });
    }

    async listByMatter(matter_id: string) {
        return this.prisma.issue.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' }, select: { issue_id: true, matter_id: true, title: true, description: true, status: true, priority: true, created_at: true, updated_at: true } });
    }

    async getByIssueId(issue_id: string) {
        return this.prisma.issue.findFirst({ where: { issue_id }, select: { issue_id: true, matter_id: true, title: true, description: true, status: true, priority: true, created_at: true, updated_at: true } });
    }

    async update(issue_id: string, patch: Partial<any>) {
        const existing = await this.prisma.issue.findFirst({ where: { issue_id } });
        if (!existing) throw new Error('Not found');
        return this.prisma.issue.update({ where: { issue_id }, data: patch as any, select: { issue_id: true, matter_id: true, title: true, description: true, status: true, priority: true, created_at: true, updated_at: true } });
    }

    async delete(issue_id: string) {
        const existing = await this.prisma.issue.findFirst({ where: { issue_id } });
        if (!existing) throw new Error('Not found');
        return this.prisma.issue.delete({ where: { issue_id } });
    }
}

export default IssueRepository;
