import type { PrismaClient } from '@lawdesk/database';
import IssueRepository from '../repositories/issueRepository';
import IssueFactRepository from '../repositories/issueFactRepository';
import FactRepository from '../repositories/factRepository';

export class IssueService {
    repo: IssueRepository;

    constructor(prisma: PrismaClient) {
        this.repo = new IssueRepository(prisma);
        (this.repo as any).prisma = prisma;
        this.factRepo = new FactRepository(prisma);
        this.issueFactRepo = new IssueFactRepository(prisma);
    }

    factRepo: FactRepository;
    issueFactRepo: IssueFactRepository;

    createIssue(matter_id: string, data: { issue_id?: string; title: string; description?: string; status?: string; priority?: string }) {
        const issue_id = String(data.issue_id || `iss-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
        const payload = { issue_id, matter_id, title: data.title, description: data.description ?? '', status: data.status ?? 'draft', priority: data.priority ?? 'medium' };
        return this.repo.create(payload as any);
    }

    listIssues(matter_id: string) {
        return this.repo.listByMatter(matter_id);
    }

    getIssue(issue_id: string) {
        return this.repo.getByIssueId(issue_id);
    }

    updateIssue(issue_id: string, patch: Partial<any>) {
        return this.repo.update(issue_id, patch);
    }

    deleteIssue(issue_id: string) {
        return this.repo.delete(issue_id);
    }

    async attachFactToIssue(matter_id: string, issue_id: string, fact_id: string, note?: string) {
        const issue = await this.repo.getByIssueId(issue_id);
        if (!issue) throw new Error('issue_not_found');
        if (String(issue.matter_id) !== String(matter_id)) throw new Error('issue_mismatch');

        const fact = await this.factRepo.getByFactId(fact_id);
        if (!fact) throw new Error('fact_not_found');
        if (String(fact.matter_id) !== String(matter_id)) throw new Error('fact_mismatch');

        return this.issueFactRepo.attachFact(issue_id, fact_id, note);
    }

    async detachFactFromIssue(matter_id: string, issue_id: string, fact_id: string) {
        const issue = await this.repo.getByIssueId(issue_id);
        if (!issue) throw new Error('issue_not_found');
        if (String(issue.matter_id) !== String(matter_id)) throw new Error('issue_mismatch');

        const fact = await this.factRepo.getByFactId(fact_id);
        if (!fact) throw new Error('fact_not_found');
        if (String(fact.matter_id) !== String(matter_id)) throw new Error('fact_mismatch');

        await this.issueFactRepo.detachFact(issue_id, fact_id);
        return { ok: true };
    }

    listIssueFacts(issue_id: string) {
        return this.issueFactRepo.listFacts(issue_id);
    }
}

export default IssueService;
