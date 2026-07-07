import type { PrismaClient } from '@lawdesk/database';
import LawRepository from '../repositories/lawRepository';
import IssueRepository from '../repositories/issueRepository';

export class LawService {
    repo: LawRepository;

    constructor(prisma: PrismaClient) {
        this.repo = new LawRepository(prisma);
        (this.repo as any).prisma = prisma;
        this.issueRepo = new IssueRepository(prisma);
    }

    issueRepo: IssueRepository;

    createLaw(matter_id: string, data: { law_id?: string; issue_id?: string; title: string; citation?: string; description?: string; status?: string }) {
        const law_id = String(data.law_id || `law-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
        const payload = { law_id, matter_id, issue_id: data.issue_id ?? undefined, title: data.title, citation: data.citation ?? '', description: data.description ?? '', status: data.status ?? 'draft' };
        return this.repo.create(payload as any);
    }

    listLaws(matter_id: string) {
        return this.repo.listByMatter(matter_id);
    }

    getLaw(law_id: string) {
        return this.repo.getByLawId(law_id);
    }

    updateLaw(law_id: string, patch: Partial<any>) {
        return this.repo.update(law_id, patch);
    }

    deleteLaw(law_id: string) {
        return this.repo.delete(law_id);
    }

    async attachToIssue(matter_id: string, law_id: string, issue_id: string) {
        const law = await this.repo.getByLawId(law_id);
        if (!law) throw new Error('law_not_found');
        if (String(law.matter_id) !== String(matter_id)) throw new Error('law_mismatch');

        const issue = await this.issueRepo.getByIssueId(issue_id);
        if (!issue) throw new Error('issue_not_found');
        if (String(issue.matter_id) !== String(matter_id)) throw new Error('issue_mismatch');

        return this.repo.update(law_id, { issue_id });
    }
}

export default LawService;
