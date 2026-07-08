import type { PrismaClient } from '@lawdesk/database'
import ProviderManager from '../../ai/providerManager'
import AIContextBuilder from './AIContextBuilder'
import {
    buildEvidencePrompt,
    buildFactPrompt,
    buildIssuePrompt,
    buildLawPrompt,
    buildArgumentPrompt,
    buildDocumentPrompt,
} from './AIPromptTemplates'
import AIOutputValidator from './AIOutputValidator'
import AIRuntimeValidationLogger from './AIRuntimeValidationLogger'

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
        const evidencePrompt = buildEvidencePrompt(context)
        const promptPack: any = {
            task: 'analyze_evidence',
            matter_id,
            materials: materials.map((m: any) => ({ title: m.title || '', description: m.description || '', ocr: m.ocr_text || '', text: m.content || m.text || '', material_type: m.material_type || '' })),
            context_pack: context,
            // include the human-facing prompt so adapters that expect system/user prompts receive it
            user_prompt: evidencePrompt,
            created_at: new Date().toISOString(),
        }

        try {
            const resp = await this.adapter.generate(promptPack)
            // adapter may return structured suggestions under resp.response.suggestions
            // Try multiple response shapes: resp.response.suggestions, resp.response array,
            // or MiniMax-style resp.response.choices[0].message.content (stringified JSON)
            let suggestions: any = null
            if (resp && resp.response) {
                if (Array.isArray(resp.response.suggestions)) suggestions = resp.response.suggestions
                else if (Array.isArray(resp.response)) suggestions = resp.response
                else if (resp.response.choices && Array.isArray(resp.response.choices) && resp.response.choices[0] && resp.response.choices[0].message && typeof resp.response.choices[0].message.content === 'string') {
                    const txt = resp.response.choices[0].message.content
                    try {
                        console.error('===== MiniMax Raw Content =====')
                        console.error(resp.response.choices[0].message.content)
                        console.error('===============================')
                        const { parseAIJson } = await import('./parseAIJson')
                        const parsed = parseAIJson(txt)
                        if (Array.isArray(parsed.data)) suggestions = parsed.data
                    } catch (_e) {
                        // ignore
                    }
                }
            }

            if (Array.isArray(suggestions)) {
                // normalize suggestions to expected shape
                return suggestions.map((s: any) => {
                    const title = String(s.title || s.name || '')
                    const rawReason = (s.reason !== undefined && s.reason !== null) ? String(s.reason) : (s.description !== undefined && s.description !== null ? String(s.description) : '')
                    const reason = rawReason ? rawReason.trim() : ''
                    const evidence_type = String(s.evidence_type || s.type || '')
                    return { title, reason, evidence_type }
                })
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
        const factPrompt = buildFactPrompt(context)
        const promptPack: any = {
            task: 'analyze_facts',
            matter_id,
            evidences: evidences.map((e: any) => ({ title: e.title || '', description: e.description || '', evidence_type: e.evidence_type || '', status: e.status || '' })),
            context_pack: context,
            user_prompt: factPrompt,
            created_at: new Date().toISOString(),
        }

        try {
            const resp = await this.adapter.generate(promptPack)
            // Try multiple response shapes: resp.response.facts, resp.response.suggestions,
            // or MiniMax-style resp.response.choices[0].message.content (stringified JSON)
            let facts: any = null
            if (resp && resp.response) {
                if (Array.isArray(resp.response.facts)) facts = resp.response.facts
                else if (Array.isArray(resp.response.suggestions)) facts = resp.response.suggestions
                else if (Array.isArray(resp.response)) facts = resp.response
                else if (resp.response.choices && Array.isArray(resp.response.choices) && resp.response.choices[0] && resp.response.choices[0].message && typeof resp.response.choices[0].message.content === 'string') {
                    const txt = resp.response.choices[0].message.content
                    try {
                        const { parseAIJson } = await import('./parseAIJson')
                        const parsed = parseAIJson(txt)
                        if (Array.isArray(parsed.data)) facts = parsed.data
                    } catch (_e) {
                        // ignore
                    }
                }
            }

            if (Array.isArray(facts)) {
                // Validate raw facts before mapping
                let validation = AIOutputValidator.validateFacts(facts)
                if (validation.ok) {
                    console.log('AI Validation PASS: facts')
                    try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Facts', provider: resp && resp.provider ? resp.provider : 'unknown', model: resp && resp.model ? resp.model : 'unknown', validation: 'PASS', retry: 0, fallback: false, missing_fields: [], latency_ms: resp && resp.duration_ms ? resp.duration_ms : null }) } catch (_) { }
                    return facts.map((f: any) => ({ title: String(f.title || f.name || ''), description: String(f.description || f.reason || ''), category: f.category, evidence_titles: f.evidence_titles }))
                }
                console.log('AI Validation FAIL: facts', validation.errors)
                try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Facts', provider: resp && resp.provider ? resp.provider : 'unknown', model: resp && resp.model ? resp.model : 'unknown', validation: 'FAIL', retry: 0, fallback: false, missing_fields: validation.errors || [], latency_ms: resp && resp.duration_ms ? resp.duration_ms : null }) } catch (_) { }
                // Retry once
                try {
                    console.log('Retry #1: facts')
                    const resp2 = await this.adapter.generate(promptPack)
                    let facts2: any = null
                    if (resp2 && resp2.response) {
                        if (Array.isArray(resp2.response.facts)) facts2 = resp2.response.facts
                        else if (Array.isArray(resp2.response.suggestions)) facts2 = resp2.response.suggestions
                        else if (Array.isArray(resp2.response)) facts2 = resp2.response
                        else if (resp2.response.choices && Array.isArray(resp2.response.choices) && resp2.response.choices[0] && resp2.response.choices[0].message && typeof resp2.response.choices[0].message.content === 'string') {
                            const txt2 = resp2.response.choices[0].message.content
                            try {
                                const { parseAIJson } = await import('./parseAIJson')
                                const parsed2 = parseAIJson(txt2)
                                if (Array.isArray(parsed2.data)) facts2 = parsed2.data
                            } catch (_e) {
                                // ignore
                            }
                        }
                    }
                    if (Array.isArray(facts2)) {
                        const validation2 = AIOutputValidator.validateFacts(facts2)
                        if (validation2.ok) {
                            console.log('AI Validation PASS: facts (retry)')
                            try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Facts', provider: resp2 && resp2.provider ? resp2.provider : (resp && resp.provider ? resp.provider : 'unknown'), model: resp2 && resp2.model ? resp2.model : (resp && resp.model ? resp.model : 'unknown'), validation: 'PASS', retry: 1, fallback: false, missing_fields: [], latency_ms: resp2 && resp2.duration_ms ? resp2.duration_ms : (resp && resp.duration_ms ? resp.duration_ms : null) }) } catch (_) { }
                            return facts2.map((f: any) => ({ title: String(f.title || f.name || ''), description: String(f.description || f.reason || ''), category: f.category, evidence_titles: f.evidence_titles }))
                        }
                        console.log('AI Validation FAIL: facts (retry)', validation2.errors)
                        try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Facts', provider: resp2 && resp2.provider ? resp2.provider : (resp && resp.provider ? resp.provider : 'unknown'), model: resp2 && resp2.model ? resp2.model : (resp && resp.model ? resp.model : 'unknown'), validation: 'FAIL', retry: 1, fallback: false, missing_fields: validation2.errors || [], latency_ms: resp2 && resp2.duration_ms ? resp2.duration_ms : (resp && resp.duration_ms ? resp.duration_ms : null) }) } catch (_) { }
                    }
                } catch (_e) {
                    // ignore
                }
                console.log('Fallback Used: facts')
                try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Facts', provider: resp && resp.provider ? resp.provider : 'unknown', model: resp && resp.model ? resp.model : 'unknown', validation: 'FAIL', retry: 1, fallback: true, missing_fields: validation.errors || [], latency_ms: resp && resp.duration_ms ? resp.duration_ms : null }) } catch (_) { }
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
        const issuePrompt = buildIssuePrompt(context)
        const promptPack: any = {
            task: 'analyze_issues',
            matter_id,
            facts: facts.map((f: any) => ({ title: f.title || '', description: f.description || '', status: f.status || '' })),
            context_pack: context,
            user_prompt: issuePrompt,
            created_at: new Date().toISOString(),
        }

        try {
            const resp = await this.adapter.generate(promptPack)
            // Try multiple response shapes: resp.response.issues, resp.response.suggestions,
            // or MiniMax-style resp.response.choices[0].message.content (stringified JSON)
            let issues: any = null
            if (resp && resp.response) {
                if (Array.isArray(resp.response.issues)) issues = resp.response.issues
                else if (Array.isArray(resp.response.suggestions)) issues = resp.response.suggestions
                else if (Array.isArray(resp.response)) issues = resp.response
                else if (resp.response.choices && Array.isArray(resp.response.choices) && resp.response.choices[0] && resp.response.choices[0].message && typeof resp.response.choices[0].message.content === 'string') {
                    const txt = resp.response.choices[0].message.content
                    try {
                        const { parseAIJson } = await import('./parseAIJson')
                        const parsed = parseAIJson(txt)
                        if (Array.isArray(parsed.data)) issues = parsed.data
                    } catch (_e) {
                        // ignore
                    }
                }
            }

            if (Array.isArray(issues)) {
                // enforce max 8 as requested; model instructed to return 3-8
                const limited = issues.slice(0, 8)
                return limited.map((it: any) => ({ title: String(it.title || it.name || ''), description: String(it.description || it.reason || '') }))
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
        let issues = await this.prisma.issue.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } as any })

        const context = await this.contextBuilder.buildMatterContext(matter_id)
        const userPrompt = buildLawPrompt(context)
        const promptPack: any = {
            task: 'analyze_laws',
            matter_id,
            issues: issues.map((it: any) => ({ title: it.title || '', description: it.description || '', status: it.status || '', priority: it.priority || '' })),
            context_pack: context,
            user_prompt: userPrompt,
            created_at: new Date().toISOString(),
        }

        try {
            const resp = await this.adapter.generate(promptPack)
            // Try multiple response shapes: resp.response.laws, resp.response.suggestions,
            // or MiniMax-style resp.response.choices[0].message.content (stringified JSON)
            let laws: any = null
            if (resp && resp.response) {
                if (Array.isArray(resp.response.laws)) laws = resp.response.laws
                else if (Array.isArray(resp.response.suggestions)) laws = resp.response.suggestions
                else if (Array.isArray(resp.response)) laws = resp.response
                else if (resp.response.choices && Array.isArray(resp.response.choices) && resp.response.choices[0] && resp.response.choices[0].message && typeof resp.response.choices[0].message.content === 'string') {
                    const txt = resp.response.choices[0].message.content
                    try {
                        const { parseAIJson } = await import('./parseAIJson')
                        const parsed = parseAIJson(txt)
                        if (Array.isArray(parsed.data)) issues = parsed.data
                    } catch (_e) {
                        // ignore
                    }
                }
            }

            if (Array.isArray(laws)) {
                // Validate laws before returning
                let validation = AIOutputValidator.validateLaws(laws)
                if (validation.ok) {
                    console.log('AI Validation PASS: laws')
                    try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Laws', provider: resp && resp.provider ? resp.provider : 'unknown', model: resp && resp.model ? resp.model : 'unknown', validation: 'PASS', retry: 0, fallback: false, missing_fields: [], latency_ms: resp && resp.duration_ms ? resp.duration_ms : null }) } catch (_) { }
                    return laws.map((l: any) => ({ title: String(l.title || l.name || ''), citation: String(l.citation || l.ref || ''), description: String(l.description || l.reason || ''), issue_title: l.issue_title }))
                }
                console.log('AI Validation FAIL: laws', validation.errors)
                try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Laws', provider: resp && resp.provider ? resp.provider : 'unknown', model: resp && resp.model ? resp.model : 'unknown', validation: 'FAIL', retry: 0, fallback: false, missing_fields: validation.errors || [], latency_ms: resp && resp.duration_ms ? resp.duration_ms : null }) } catch (_) { }
                // Retry once
                try {
                    console.log('Retry #1: laws')
                    const resp2 = await this.adapter.generate(promptPack)
                    let laws2: any = null
                    if (resp2 && resp2.response) {
                        if (Array.isArray(resp2.response.laws)) laws2 = resp2.response.laws
                        else if (Array.isArray(resp2.response.suggestions)) laws2 = resp2.response.suggestions
                        else if (Array.isArray(resp2.response)) laws2 = resp2.response
                        else if (resp2.response.choices && Array.isArray(resp2.response.choices) && resp2.response.choices[0] && resp2.response.choices[0].message && typeof resp2.response.choices[0].message.content === 'string') {
                            const txt2 = resp2.response.choices[0].message.content
                            try {
                                const { parseAIJson } = await import('./parseAIJson')
                                const parsed2 = parseAIJson(txt2)
                                if (Array.isArray(parsed2.data)) laws2 = parsed2.data
                            } catch (_e) {
                                // ignore
                            }
                        }
                    }
                    if (Array.isArray(laws2)) {
                        const validation2 = AIOutputValidator.validateLaws(laws2)
                        if (validation2.ok) {
                            console.log('AI Validation PASS: laws (retry)')
                            try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Laws', provider: resp2 && resp2.provider ? resp2.provider : (resp && resp.provider ? resp.provider : 'unknown'), model: resp2 && resp2.model ? resp2.model : (resp && resp.model ? resp.model : 'unknown'), validation: 'PASS', retry: 1, fallback: false, missing_fields: [], latency_ms: resp2 && resp2.duration_ms ? resp2.duration_ms : (resp && resp.duration_ms ? resp.duration_ms : null) }) } catch (_) { }
                            return laws2.map((l: any) => ({ title: String(l.title || l.name || ''), citation: String(l.citation || l.ref || ''), description: String(l.description || l.reason || ''), issue_title: l.issue_title }))
                        }
                        console.log('AI Validation FAIL: laws (retry)', validation2.errors)
                        try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Laws', provider: resp2 && resp2.provider ? resp2.provider : (resp && resp.provider ? resp.provider : 'unknown'), model: resp2 && resp2.model ? resp2.model : (resp && resp.model ? resp.model : 'unknown'), validation: 'FAIL', retry: 1, fallback: false, missing_fields: validation2.errors || [], latency_ms: resp2 && resp2.duration_ms ? resp2.duration_ms : (resp && resp.duration_ms ? resp.duration_ms : null) }) } catch (_) { }
                    }
                } catch (_e) {
                    // ignore
                }
                console.log('Fallback Used: laws')
                try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Laws', provider: resp && resp.provider ? resp.provider : 'unknown', model: resp && resp.model ? resp.model : 'unknown', validation: 'FAIL', retry: 1, fallback: true, missing_fields: validation.errors || [], latency_ms: resp && resp.duration_ms ? resp.duration_ms : null }) } catch (_) { }
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
        const context = await this.contextBuilder.buildMatterContext(matter_id)
        const facts = Array.isArray(context.facts) ? context.facts : []
        let issues = Array.isArray(context.issues) ? context.issues : []
        const laws = Array.isArray(context.laws) ? context.laws : []

        const userPrompt = buildArgumentPrompt(context)
        const promptPack: any = {
            task: 'analyze_arguments',
            matter_id,
            facts: facts.map((f: any) => ({ title: f.title || '', description: f.description || '', status: f.status || '' })),
            issues: issues.map((it: any) => ({ title: it.title || '', description: it.description || '', status: it.status || '', priority: it.priority || '' })),
            laws: laws.map((l: any) => ({ title: l.title || '', citation: l.citation || '', description: l.description || '', status: l.status || '' })),
            context_pack: context,
            user_prompt: userPrompt,
            created_at: new Date().toISOString(),
        }

        try {
            const resp = await this.adapter.generate(promptPack)
            // adapter may return structured arguments under resp.response.arguments or resp.response.suggestions
            // Parse multiple shapes: resp.response.arguments, resp.response.suggestions,
            // or MiniMax-style resp.response.choices[0].message.content (stringified JSON)
            let args: any = null
            if (resp && resp.response) {
                if (Array.isArray(resp.response.arguments)) args = resp.response.arguments
                else if (Array.isArray(resp.response.suggestions)) args = resp.response.suggestions
                else if (Array.isArray(resp.response)) args = resp.response
                else if (resp.response.choices && Array.isArray(resp.response.choices) && resp.response.choices[0] && resp.response.choices[0].message && typeof resp.response.choices[0].message.content === 'string') {
                    const txt = resp.response.choices[0].message.content
                    try {
                        const { parseAIJson } = await import('./parseAIJson')
                        const parsed = parseAIJson(txt)
                        if (Array.isArray(parsed.data)) args = parsed.data
                    } catch (_e) {
                        // ignore
                    }
                }
            }

            if (Array.isArray(args)) {
                // Validate arguments before mapping
                let validation = AIOutputValidator.validateArguments(args)
                if (validation.ok) {
                    console.log('AI Validation PASS: arguments')
                    try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Arguments', provider: resp && resp.provider ? resp.provider : 'unknown', model: resp && resp.model ? resp.model : 'unknown', validation: 'PASS', retry: 0, fallback: false, missing_fields: [], latency_ms: resp && resp.duration_ms ? resp.duration_ms : null }) } catch (_) { }
                    return args.map((a: any) => ({ title: String(a.title || a.name || ''), description: String(a.description || a.reason || ''), conclusion: String(a.conclusion || a.conclude || ''), issue_title: a.issue_title, fact_titles: a.fact_titles, law_citations: a.law_citations }))
                }
                console.log('AI Validation FAIL: arguments', validation.errors)
                try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Arguments', provider: resp && resp.provider ? resp.provider : 'unknown', model: resp && resp.model ? resp.model : 'unknown', validation: 'FAIL', retry: 0, fallback: false, missing_fields: validation.errors || [], latency_ms: resp && resp.duration_ms ? resp.duration_ms : null }) } catch (_) { }
                try {
                    console.log('Retry #1: arguments')
                    const resp2 = await this.adapter.generate(promptPack)
                    let args2: any = null
                    if (resp2 && resp2.response) {
                        if (Array.isArray(resp2.response.arguments)) args2 = resp2.response.arguments
                        else if (Array.isArray(resp2.response.suggestions)) args2 = resp2.response.suggestions
                        else if (Array.isArray(resp2.response)) args2 = resp2.response
                        else if (resp2.response.choices && Array.isArray(resp2.response.choices) && resp2.response.choices[0] && resp2.response.choices[0].message && typeof resp2.response.choices[0].message.content === 'string') {
                            const txt2 = resp2.response.choices[0].message.content
                            try {
                                const { parseAIJson } = await import('./parseAIJson')
                                const parsed2 = parseAIJson(txt2)
                                if (Array.isArray(parsed2.data)) args2 = parsed2.data
                            } catch (_e) {
                                // ignore
                            }
                        }
                    }
                    if (Array.isArray(args2)) {
                        const validation2 = AIOutputValidator.validateArguments(args2)
                        if (validation2.ok) {
                            console.log('AI Validation PASS: arguments (retry)')
                            try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Arguments', provider: resp2 && resp2.provider ? resp2.provider : (resp && resp.provider ? resp.provider : 'unknown'), model: resp2 && resp2.model ? resp2.model : (resp && resp.model ? resp.model : 'unknown'), validation: 'PASS', retry: 1, fallback: false, missing_fields: [], latency_ms: resp2 && resp2.duration_ms ? resp2.duration_ms : (resp && resp.duration_ms ? resp.duration_ms : null) }) } catch (_) { }
                            return args2.map((a: any) => ({ title: String(a.title || a.name || ''), description: String(a.description || a.reason || ''), conclusion: String(a.conclusion || a.conclude || ''), issue_title: a.issue_title, fact_titles: a.fact_titles, law_citations: a.law_citations }))
                        }
                        console.log('AI Validation FAIL: arguments (retry)', validation2.errors)
                        try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Arguments', provider: resp2 && resp2.provider ? resp2.provider : (resp && resp.provider ? resp.provider : 'unknown'), model: resp2 && resp2.model ? resp2.model : (resp && resp.model ? resp.model : 'unknown'), validation: 'FAIL', retry: 1, fallback: false, missing_fields: validation2.errors || [], latency_ms: resp2 && resp2.duration_ms ? resp2.duration_ms : (resp && resp.duration_ms ? resp.duration_ms : null) }) } catch (_) { }
                    }
                } catch (_e) {
                    // ignore
                }
                console.log('Fallback Used: arguments')
                try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Arguments', provider: resp && resp.provider ? resp.provider : 'unknown', model: resp && resp.model ? resp.model : 'unknown', validation: 'FAIL', retry: 1, fallback: true, missing_fields: validation.errors || [], latency_ms: resp && resp.duration_ms ? resp.duration_ms : null }) } catch (_) { }
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
        const context = await this.contextBuilder.buildMatterContext(matter_id)
        const args = Array.isArray(context.arguments) ? context.arguments : []

        const userPrompt = buildDocumentPrompt(context)
        const promptPack: any = {
            task: 'generate_documents',
            matter_id,
            arguments: args.map((a: any) => ({ title: a.title || '', description: a.description || '', conclusion: a.conclusion || '', status: a.status || '' })),
            context_pack: context,
            user_prompt: userPrompt,
            created_at: new Date().toISOString(),
        }

        try {
            const resp = await this.adapter.generate(promptPack)
            // Try multiple shapes: resp.response.documents, resp.response.suggestions,
            // or MiniMax-style resp.response.choices[0].message.content (stringified JSON)
            let docs: any = null
            if (resp && resp.response) {
                if (Array.isArray(resp.response.documents)) docs = resp.response.documents
                else if (Array.isArray(resp.response.suggestions)) docs = resp.response.suggestions
                else if (Array.isArray(resp.response)) docs = resp.response
                else if (resp.response.choices && Array.isArray(resp.response.choices) && resp.response.choices[0] && resp.response.choices[0].message && typeof resp.response.choices[0].message.content === 'string') {
                    const txt = resp.response.choices[0].message.content
                    try {
                        const { parseAIJson } = await import('./parseAIJson')
                        const parsed = parseAIJson(txt)
                        if (Array.isArray(parsed.data)) docs = parsed.data
                    } catch (_e) {
                        // ignore
                    }
                }
            }

            if (Array.isArray(docs)) {
                // Validate documents before returning
                let validation = AIOutputValidator.validateDocuments(docs)
                if (validation.ok) {
                    console.log('AI Validation PASS: documents')
                    try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Documents', provider: resp && resp.provider ? resp.provider : 'unknown', model: resp && resp.model ? resp.model : 'unknown', validation: 'PASS', retry: 0, fallback: false, missing_fields: [], latency_ms: resp && resp.duration_ms ? resp.duration_ms : null }) } catch (_) { }
                    return docs.map((d: any) => ({ title: String(d.title || ''), document_type: String(d.document_type || d.type || ''), content: String(d.content || d.body || ''), status: String(d.status || 'draft') }))
                }
                console.log('AI Validation FAIL: documents', validation.errors)
                try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Documents', provider: resp && resp.provider ? resp.provider : 'unknown', model: resp && resp.model ? resp.model : 'unknown', validation: 'FAIL', retry: 0, fallback: false, missing_fields: validation.errors || [], latency_ms: resp && resp.duration_ms ? resp.duration_ms : null }) } catch (_) { }
                try {
                    console.log('Retry #1: documents')
                    const resp2 = await this.adapter.generate(promptPack)
                    let docs2: any = null
                    if (resp2 && resp2.response) {
                        if (Array.isArray(resp2.response.documents)) docs2 = resp2.response.documents
                        else if (Array.isArray(resp2.response.suggestions)) docs2 = resp2.response.suggestions
                        else if (Array.isArray(resp2.response)) docs2 = resp2.response
                        else if (resp2.response.choices && Array.isArray(resp2.response.choices) && resp2.response.choices[0] && resp2.response.choices[0].message && typeof resp2.response.choices[0].message.content === 'string') {
                            const txt2 = resp2.response.choices[0].message.content
                            try {
                                const { parseAIJson } = await import('./parseAIJson')
                                const parsed2 = parseAIJson(txt2)
                                if (Array.isArray(parsed2.data)) docs2 = parsed2.data
                            } catch (_e) {
                                // ignore
                            }
                        }
                    }
                    if (Array.isArray(docs2)) {
                        const validation2 = AIOutputValidator.validateDocuments(docs2)
                        if (validation2.ok) {
                            console.log('AI Validation PASS: documents (retry)')
                            try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Documents', provider: resp2 && resp2.provider ? resp2.provider : (resp && resp.provider ? resp.provider : 'unknown'), model: resp2 && resp2.model ? resp2.model : (resp && resp.model ? resp.model : 'unknown'), validation: 'PASS', retry: 1, fallback: false, missing_fields: [], latency_ms: resp2 && resp2.duration_ms ? resp2.duration_ms : (resp && resp.duration_ms ? resp.duration_ms : null) }) } catch (_) { }
                            return docs2.map((d: any) => ({ title: String(d.title || ''), document_type: String(d.document_type || d.type || ''), content: String(d.content || d.body || ''), status: String(d.status || 'draft') }))
                        }
                        console.log('AI Validation FAIL: documents (retry)', validation2.errors)
                        try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Documents', provider: resp2 && resp2.provider ? resp2.provider : (resp && resp.provider ? resp.provider : 'unknown'), model: resp2 && resp2.model ? resp2.model : (resp && resp.model ? resp.model : 'unknown'), validation: 'FAIL', retry: 1, fallback: false, missing_fields: validation2.errors || [], latency_ms: resp2 && resp2.duration_ms ? resp2.duration_ms : (resp && resp.duration_ms ? resp.duration_ms : null) }) } catch (_) { }
                    }
                } catch (_e) {
                    // ignore
                }
                console.log('Fallback Used: documents')
                try { AIRuntimeValidationLogger.logValidation({ timestamp: new Date().toISOString(), module: 'Documents', provider: resp && resp.provider ? resp.provider : 'unknown', model: resp && resp.model ? resp.model : 'unknown', validation: 'FAIL', retry: 1, fallback: true, missing_fields: validation.errors || [], latency_ms: resp && resp.duration_ms ? resp.duration_ms : null }) } catch (_) { }
            }
        } catch (e) {
            // ignore and fallback below
        }

        // fallback: synthesize simple document drafts from arguments
        // Fallback: always produce 起诉状 and 证据目录 with substantive content
        const factsFor = Array.isArray(context.facts) ? context.facts : []
        const evidences = Array.isArray(context.materials) ? context.materials : (Array.isArray(context.evidence) ? context.evidence : [])

        const makeQingsu = () => {
            const parties = factsFor.slice(0, 3).map((f: any, i: number) => `（根据现有材料第${i + 1}条）${f.title || f.description || ''}`).join('\n')
            const factsText = factsFor.map((f: any, idx: number) => `事实 ${idx + 1}：${f.title || f.description || ''}`).join('\n')
            const evidenceText = (evidences && evidences.length ? evidences.map((e: any, i: number) => `${i + 1}. ${e.title || e.name || '证据'} — 证明目的：${e.description || '证明相关事实'}`).join('\n') : '根据现有材料可初步表述为：证据清单见下文')
            let content = `根据现有材料可初步表述为：\n${parties}\n\n诉讼请求：\n1. 请求法院依法支持原告的主张。\n\n事实与理由：\n${factsText}\n\n证据：\n${evidenceText}\n\n以上为基于现有材料的初步起诉状草稿，供律师编辑完善。`
            if (content.length < 400) content = content + '\n' + '注：根据现有材料可进一步补充事实细节与证据说明，以满足起诉状要件。'.repeat(10)
            return { title: '起诉状（初稿）', document_type: '起诉状', content }
        }

        const makeEvidenceList = () => {
            const list = (evidences && evidences.length ? evidences.map((e: any, i: number) => `证据 ${i + 1}：${e.title || e.name || '证据'}\n证明目的：${e.description || '证明与事实相关之要点'}`).join('\n\n') : '根据现有材料可初步表述为：未检索到具体证据条目')
            let content = `证据目录：\n${list}\n\n说明：每项证据后应说明其证明目的，便于在庭审或文书中引用。`
            if (content.length < 400) content = content + '\n' + '注：请补充证据来源、页码及附件序号。'.repeat(10)
            return { title: '证据目录（初稿）', document_type: '证据目录', content }
        }

        const fallbackDocs = [makeQingsu(), makeEvidenceList()]
        return fallbackDocs
    }
}

export default AIService
