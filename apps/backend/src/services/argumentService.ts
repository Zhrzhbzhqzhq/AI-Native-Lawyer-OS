import type { PrismaClient } from '@lawdesk/database';
import ArgumentRepository from '../repositories/argumentRepository';

export class ArgumentService {
    repo: ArgumentRepository;

    constructor(prisma: PrismaClient) {
        this.repo = new ArgumentRepository(prisma);
        (this.repo as any).prisma = prisma;
    }

    createArgument(matter_id: string, data: { argument_id?: string; issue_id?: string; title: string; description?: string; conclusion?: string; status?: string }) {
        const argument_id = String(data.argument_id || `arg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
        const payload = { argument_id, matter_id, issue_id: data.issue_id ?? undefined, title: data.title, description: data.description ?? '', conclusion: data.conclusion ?? '', status: data.status ?? 'draft' };
        return this.repo.create(payload as any);
    }

    listArguments(matter_id: string) {
        return this.repo.listByMatter(matter_id);
    }

    getArgument(argument_id: string) {
        return this.repo.getByArgumentId(argument_id);
    }

    updateArgument(argument_id: string, patch: Partial<any>) {
        return this.repo.update(argument_id, patch);
    }

    deleteArgument(argument_id: string) {
        return this.repo.delete(argument_id);
    }
}

export default ArgumentService;
