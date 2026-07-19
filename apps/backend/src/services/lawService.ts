import type { PrismaClient } from '@lawdesk/database';
import LawRepository from '../repositories/lawRepository';
import IssueRepository from '../repositories/issueRepository';
import { formatFormalLawForDisplay, parseFormalLaw } from './formalSemanticCodec';

function presentLaw<T extends Record<string, any>>(law: T): T {
    return { ...law, description: formatFormalLawForDisplay(parseFormalLaw(law.description)) };
}

export class LawService {
    repo: LawRepository;

    constructor(prisma: PrismaClient) {
        this.repo = new LawRepository(prisma);
        (this.repo as any).prisma = prisma;
        this.issueRepo = new IssueRepository(prisma);
    }

    issueRepo: IssueRepository;

    async createLaw(matter_id: string, data: { law_id?: string; issue_id?: string; title: string; citation?: string; description?: string; status?: string }) {
        const law_id = String(data.law_id || `law-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
        const payload = { law_id, matter_id, issue_id: data.issue_id ?? undefined, title: data.title, citation: data.citation ?? '', description: data.description ?? '', status: data.status ?? 'draft' };
        return presentLaw(await this.repo.create(payload as any));
    }

    async listLaws(matter_id: string) {
        return (await this.repo.listByMatter(matter_id)).map((law: any) => presentLaw(law));
    }

    async getLaw(law_id: string) {
        const law = await this.repo.getByLawId(law_id);
        return law ? presentLaw(law) : null;
    }

    async updateLaw(law_id: string, patch: Partial<any>) {
        return presentLaw(await this.repo.update(law_id, patch));
    }

    async deleteLaw(law_id: string) {
        return presentLaw(await this.repo.delete(law_id));
    }

    async attachToIssue(matter_id: string, law_id: string, issue_id: string) {
        const law = await this.repo.getByLawId(law_id);
        if (!law) throw new Error('law_not_found');
        if (String(law.matter_id) !== String(matter_id)) throw new Error('law_mismatch');

        const issue = await this.issueRepo.getByIssueId(issue_id);
        if (!issue) throw new Error('issue_not_found');
        if (String(issue.matter_id) !== String(matter_id)) throw new Error('issue_mismatch');

        return presentLaw(await this.repo.update(law_id, { issue_id }));
    }
}

export default LawService;
