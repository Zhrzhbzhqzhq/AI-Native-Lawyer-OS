import type { PrismaClient } from '@lawdesk/database'
import ProviderManager from '../../ai/providerManager'

export class AIService {
    prisma: PrismaClient
    adapter: any

    constructor(prisma: PrismaClient) {
        this.prisma = prisma
        this.adapter = ProviderManager.getAdapter()
    }

    // analyzeEvidence: reads materials under the matter and asks the adapter
    // to identify candidate evidence items. Returns an array of suggestions.
    async analyzeEvidence(matter_id: string) {
        // fetch materials
        const materials = await this.prisma.material.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } as any })

        // build a simple promptPack for adapter
        const promptPack = {
            task: 'analyze_evidence',
            matter_id,
            materials: materials.map((m: any) => ({ title: m.title || '', description: m.description || '', ocr: m.ocr_text || '', text: m.content || m.text || '', material_type: m.material_type || '' })),
            created_at: new Date().toISOString(),
        }

        try {
            const resp = await this.adapter.generate(promptPack)
            // adapter may return structured suggestions under resp.response.suggestions
            const suggestions = (resp && resp.response && Array.isArray(resp.response.suggestions)) ? resp.response.suggestions : null
            if (Array.isArray(suggestions)) {
                // normalize suggestions to expected shape
                return suggestions.map((s: any) => ({ title: String(s.title || s.name || ''), reason: String(s.reason || s.description || ''), evidence_type: String(s.evidence_type || s.type || '') }))
            }
        } catch (e) {
            // fall through to material-derived suggestions
            // console.error('ai adapter failed', e)
        }

        // fallback: turn materials into suggestions
        const fallback = materials.slice(0, 5).map((m: any) => ({ title: m.title || '未命名材料', reason: m.description || (m.storage_uri ? `来自 ${m.storage_uri}` : '材料可能包含有力证据'), evidence_type: m.material_type || '文书' }))
        return fallback
    }

    // analyzeFacts: reads evidences under the matter and asks adapter to suggest facts
    async analyzeFacts(matter_id: string) {
        const evidences = await this.prisma.evidence.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } as any })

        const promptPack = {
            task: 'analyze_facts',
            matter_id,
            evidences: evidences.map((e: any) => ({ title: e.title || '', description: e.description || '', evidence_type: e.evidence_type || '', status: e.status || '' })),
            created_at: new Date().toISOString(),
        }

        try {
            const resp = await this.adapter.generate(promptPack)
            // adapter may return structured facts under resp.response.facts or resp.response.suggestions
            const facts = resp && resp.response && (Array.isArray(resp.response.facts) ? resp.response.facts : (Array.isArray(resp.response.suggestions) ? resp.response.suggestions : null))
            if (Array.isArray(facts)) {
                return facts.map((f: any) => ({ title: String(f.title || f.name || ''), description: String(f.description || f.reason || '') }))
            }
        } catch (e) {
            // ignore and fallback below
        }

        // fallback: create simple fact suggestions from evidences
        const fallbackFacts = evidences.slice(0, 5).map((e: any) => ({ title: e.title ? `关于：${e.title}` : '未命名事实', description: e.description || `基于证据类型 ${e.evidence_type || '未知'}（状态：${e.status || 'unknown'}）` }))
        return fallbackFacts
    }

    // analyzeIssues: reads facts under the matter and asks adapter to suggest issues
    async analyzeIssues(matter_id: string) {
        const facts = await this.prisma.fact.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } as any })

        const promptPack = {
            task: 'analyze_issues',
            matter_id,
            facts: facts.map((f: any) => ({ title: f.title || '', description: f.description || '', status: f.status || '' })),
            created_at: new Date().toISOString(),
        }

        try {
            const resp = await this.adapter.generate(promptPack)
            // adapter may return structured issues under resp.response.issues or resp.response.suggestions
            const issues = resp && resp.response && (Array.isArray(resp.response.issues) ? resp.response.issues : (Array.isArray(resp.response.suggestions) ? resp.response.suggestions : null))
            if (Array.isArray(issues)) {
                return issues.map((it: any) => ({ title: String(it.title || it.name || ''), description: String(it.description || it.reason || '') }))
            }
        } catch (e) {
            // ignore and fallback below
        }

        // fallback: synthesize issues from facts
        const fallbackIssues = facts.slice(0, 5).map((f: any) => ({ title: f.title ? `需确认：${f.title}` : '需确认事实', description: f.description || '基于现有事实，需要进一步核查或法律认定' }))
        return fallbackIssues
    }
}

export default AIService
