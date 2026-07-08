import type { PrismaClient } from '@lawdesk/database';

export class ArgumentRepository {
    prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async create(data: { argument_id: string; matter_id: string; issue_id?: string; title: string; description?: string; conclusion?: string; status?: string }) {
        const payload = {
            argument_id: data.argument_id,
            matter_id: data.matter_id,
            issue_id: data.issue_id ?? null,
            title: data.title,
            description: data.description ?? '',
            conclusion: data.conclusion ?? '',
            status: data.status ?? 'draft',
        };
        return this.prisma.argument.create({ data: payload as any });
    }

    async listByMatter(matter_id: string) {
        return this.prisma.argument.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' }, select: { argument_id: true, matter_id: true, issue_id: true, title: true, description: true, conclusion: true, status: true, created_at: true, updated_at: true } });
    }

    async getByArgumentId(argument_id: string) {
        return this.prisma.argument.findFirst({ where: { argument_id }, select: { argument_id: true, matter_id: true, issue_id: true, title: true, description: true, conclusion: true, status: true, created_at: true, updated_at: true } });
    }

    async update(argument_id: string, patch: Partial<any>) {
        const existing = await this.prisma.argument.findFirst({ where: { argument_id } });
        if (!existing) throw new Error('Not found');
        return this.prisma.argument.update({ where: { argument_id }, data: patch as any, select: { argument_id: true, matter_id: true, issue_id: true, title: true, description: true, conclusion: true, status: true, created_at: true, updated_at: true } });
    }

    async delete(argument_id: string) {
        const existing = await this.prisma.argument.findFirst({ where: { argument_id } });
        if (!existing) throw new Error('Not found');
        return this.prisma.argument.delete({ where: { argument_id } });
    }
}

export default ArgumentRepository;
