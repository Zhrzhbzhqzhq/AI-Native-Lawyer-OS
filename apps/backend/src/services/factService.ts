import type { PrismaClient } from '@lawdesk/database';
import FactRepository from '../repositories/factRepository';
import EvidenceRepository from '../repositories/evidenceRepository';

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

    async attachEvidenceToFact(matter_id: string, fact_id: string, evidence_id: string, note?: string) {
        // verify fact exists and belongs to matter
        const fact = await this.repo.getByFactId(fact_id);
        if (!fact) throw new Error('fact_not_found');
        if (String(fact.matter_id) !== String(matter_id)) throw new Error('fact_mismatch');

        // verify evidence exists and belongs to same matter
        const evRepo = new EvidenceRepository((this.repo as any).prisma);
        const evList = await evRepo.findByMatterId(matter_id);
        const exists = Array.isArray(evList) && evList.some((e: any) => String(e.evidence_id) === String(evidence_id));
        if (!exists) throw new Error('evidence_not_found');

        // attach (idempotent)
        return this.repo.attachEvidence(fact_id, evidence_id, note);
    }

    async detachEvidenceFromFact(matter_id: string, fact_id: string, evidence_id: string) {
        const fact = await this.repo.getByFactId(fact_id);
        if (!fact) throw new Error('fact_not_found');
        if (String(fact.matter_id) !== String(matter_id)) throw new Error('fact_mismatch');

        const evRepo = new EvidenceRepository((this.repo as any).prisma);
        const evList = await evRepo.findByMatterId(matter_id);
        const exists = Array.isArray(evList) && evList.some((e: any) => String(e.evidence_id) === String(evidence_id));
        if (!exists) throw new Error('evidence_not_found');

        await this.repo.detachEvidence(fact_id, evidence_id);
        return { ok: true };
    }

    listFactEvidence(fact_id: string) {
        return this.repo.listFactEvidence(fact_id);
    }
}

export default FactService;
