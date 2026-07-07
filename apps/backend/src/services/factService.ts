import type { PrismaClient } from '@lawdesk/database';
import FactRepository from '../repositories/factRepository';

export class FactService {
    repo: FactRepository;

    constructor(prisma: PrismaClient) {
        this.repo = new FactRepository(prisma);
    }

    createFact(matter_id: string, data: { fact_id?: string; title: string; description?: string; status?: string }) {
        const fact_id = String(data.fact_id || `fct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
        const payload = { fact_id, matter_id, title: data.title, description: data.description ?? '', status: data.status ?? 'draft' };
        return this.repo.create(payload as any);
    }

    listFacts(matter_id: string) {
        return this.repo.listByMatter(matter_id);
    }

    getFact(fact_id: string) {
        return this.repo.getByFactId(fact_id);
    }

    updateFact(fact_id: string, patch: Partial<any>) {
        return this.repo.update(fact_id, patch);
    }

    deleteFact(fact_id: string) {
        return this.repo.delete(fact_id);
    }
}

export default FactService;
