import type { PrismaClient } from '@lawdesk/database';
import ArgumentRepository from '../repositories/argumentRepository';
import { formatFormalArgumentForDisplay, parseFormalArgument } from './formalSemanticCodec';

function presentArgument<T extends Record<string, any>>(argument: T): T {
    return { ...argument, description: formatFormalArgumentForDisplay(parseFormalArgument(argument.description)) };
}

export class ArgumentService {
    repo: ArgumentRepository;

    constructor(prisma: PrismaClient) {
        this.repo = new ArgumentRepository(prisma);
        (this.repo as any).prisma = prisma;
    }

    async createArgument(matter_id: string, data: { argument_id?: string; issue_id?: string; title: string; description?: string; conclusion?: string; status?: string }) {
        const argument_id = String(data.argument_id || `arg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
        const payload = { argument_id, matter_id, issue_id: data.issue_id ?? undefined, title: data.title, description: data.description ?? '', conclusion: data.conclusion ?? '', status: data.status ?? 'draft' };
        return presentArgument(await this.repo.create(payload as any));
    }

    async listArguments(matter_id: string) {
        return (await this.repo.listByMatter(matter_id)).map((argument: any) => presentArgument(argument));
    }

    async getArgument(argument_id: string) {
        const argument = await this.repo.getByArgumentId(argument_id);
        return argument ? presentArgument(argument) : null;
    }

    async updateArgument(argument_id: string, patch: Partial<any>) {
        return presentArgument(await this.repo.update(argument_id, patch));
    }

    async deleteArgument(argument_id: string) {
        return presentArgument(await this.repo.delete(argument_id));
    }
}

export default ArgumentService;
