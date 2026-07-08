import type { PrismaClient } from '@lawdesk/database'
import ProviderManager from '../../ai/providerManager'
import AIContextBuilder from './AIContextBuilder'

export class AIService {
    prisma: PrismaClient
    adapter: any
    contextBuilder: AIContextBuilder

    constructor(prisma: PrismaClient) {
        this.prisma = prisma
        this.adapter = ProviderManager.getAdapter()
        this.contextBuilder = new AIContextBuilder(prisma)
    }

    // analyzeEvidence: reads materials under the matter and asks the adapter
    // to identify candidate evidence items. Returns an array of suggestions.
    async analyzeEvidence(matter_id: string) {
        // fetch materials
        const materials = await this.prisma.material.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } as any })

        const context = await this.contextBuilder.buildMatterContext(matter_id)
        // build a simple promptPack for adapter
        const promptPack = {
            task: 'analyze_evidence',
            matter_id,
            materials: materials.map((m: any) => ({ title: m.title || '', description: m.description || '', ocr: m.ocr_text || '', text: m.content || m.text || '', material_type: m.material_type || '' })),
            context_pack: context,
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

        const context = await this.contextBuilder.buildMatterContext(matter_id)
        const promptPack = {
            task: 'analyze_facts',
            matter_id,
            evidences: evidences.map((e: any) => ({ title: e.title || '', description: e.description || '', evidence_type: e.evidence_type || '', status: e.status || '' })),
            context_pack: context,
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

        const context = await this.contextBuilder.buildMatterContext(matter_id)
        const promptPack = {
            task: 'analyze_issues',
            matter_id,
            facts: facts.map((f: any) => ({ title: f.title || '', description: f.description || '', status: f.status || '' })),
            context_pack: context,
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

    // analyzeLaws: reads issues under the matter and asks adapter to suggest applicable laws
    async analyzeLaws(matter_id: string) {
        const issues = await this.prisma.issue.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } as any })

        const context = await this.contextBuilder.buildMatterContext(matter_id)
        const promptPack = {
            task: 'analyze_laws',
            matter_id,
            issues: issues.map((it: any) => ({ title: it.title || '', description: it.description || '', status: it.status || '', priority: it.priority || '' })),
            context_pack: context,
            created_at: new Date().toISOString(),
        }

        try {
            const resp = await this.adapter.generate(promptPack)
            // adapter may return structured laws under resp.response.laws or resp.response.suggestions
            const laws = resp && resp.response && (Array.isArray(resp.response.laws) ? resp.response.laws : (Array.isArray(resp.response.suggestions) ? resp.response.suggestions : null))
            if (Array.isArray(laws)) {
                return laws.map((l: any) => ({ title: String(l.title || l.name || ''), citation: String(l.citation || l.ref || ''), description: String(l.description || l.reason || '') }))
            }
        } catch (e) {
            // ignore and fallback below
        }

        // fallback: suggest generic laws based on issues
        const fallback = issues.slice(0, 5).map((it: any) => ({ title: it.title ? `可能适用法律：${it.title}` : '可能适用法律', citation: '', description: it.description || '根据现有问题，建议核查相关法律条文。' }))
        return fallback
    }

    // analyzeArguments: reads issues and laws under the matter and asks adapter to suggest arguments
    async analyzeArguments(matter_id: string) {
        const issues = await this.prisma.issue.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } as any })
        const laws = await this.prisma.law.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } as any })

        const context = await this.contextBuilder.buildMatterContext(matter_id)
        const promptPack = {
            task: 'analyze_arguments',
            matter_id,
            issues: issues.map((it: any) => ({ title: it.title || '', description: it.description || '', status: it.status || '', priority: it.priority || '' })),
            laws: laws.map((l: any) => ({ title: l.title || '', citation: l.citation || '', description: l.description || '', status: l.status || '' })),
            context_pack: context,
            created_at: new Date().toISOString(),
        }

        try {
            const resp = await this.adapter.generate(promptPack)
            // adapter may return structured arguments under resp.response.arguments or resp.response.suggestions
            const args = resp && resp.response && (Array.isArray(resp.response.arguments) ? resp.response.arguments : (Array.isArray(resp.response.suggestions) ? resp.response.suggestions : null))
            if (Array.isArray(args)) {
                return args.map((a: any) => ({ title: String(a.title || a.name || ''), description: String(a.description || a.reason || ''), conclusion: String(a.conclusion || a.conclude || '') }))
            }
        } catch (e) {
            // ignore and fallback below
        }

        // fallback: synthesize simple arguments combining issues and laws
        const combined = issues.slice(0, 3).map((it: any, idx: number) => {
            const relatedLaw = laws[idx] || laws[0] || null
            return {
                title: it.title ? `关于 ${it.title} 的论证` : '法律论证',
                description: `${it.description || '基于现有事实'}；参考法律：${relatedLaw ? relatedLaw.title : '无特定法律'}`,
                conclusion: relatedLaw ? `基于${relatedLaw.title}，可主张...` : '需进一步检索适用法律以得出结论',
            }
        })
        return combined
    }

    // generateDocuments: reads arguments under the matter and asks adapter to suggest document drafts
    async generateDocuments(matter_id: string) {
        const args = await this.prisma.argument.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } as any })

        const context = await this.contextBuilder.buildMatterContext(matter_id)
        const promptPack = {
            task: 'generate_documents',
            matter_id,
            arguments: args.map((a: any) => ({ title: a.title || '', description: a.description || '', conclusion: a.conclusion || '', status: a.status || '' })),
            context_pack: context,
            created_at: new Date().toISOString(),
        }

        try {
            const resp = await this.adapter.generate(promptPack)
            // adapter may return structured documents under resp.response.documents or resp.response.suggestions
            const docs = resp && resp.response && (Array.isArray(resp.response.documents) ? resp.response.documents : (Array.isArray(resp.response.suggestions) ? resp.response.suggestions : null))
            if (Array.isArray(docs)) {
                return docs.map((d: any) => ({ title: String(d.title || ''), document_type: String(d.document_type || d.type || ''), content: String(d.content || d.body || ''), status: String(d.status || 'draft') }))
            }
        } catch (e) {
            // ignore and fallback below
        }

        // fallback: synthesize simple document drafts from arguments
        const fallback = args.slice(0, 5).map((a: any) => ({ title: a.title ? `草稿：${a.title}` : '文书草稿', document_type: 'complaint', content: a.description || a.conclusion || '基于现有论证生成文书草稿', status: 'draft' }))
        return fallback
    }
}

export default AIService
