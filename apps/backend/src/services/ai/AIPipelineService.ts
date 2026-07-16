import { ProviderManager } from '../../ai/providerManager'
import type LlmAdapter from '../../ai/llmAdapter'
import parseAIJson from './AIJsonParser'

export default class AIPipelineService {
    adapter: LlmAdapter

    constructor() {
        this.adapter = ProviderManager.getAdapter()
    }

    async run(caseSummary: string) {
        const steps: any = { evidence: [], facts: [], issues: [], laws: [], arguments: [], documents: [] }
        const raw: any = {}
        let fallback_used = false
        let provider = ProviderManager.getConfiguredProvider()
        let model = provider === 'mock' ? 'mock-lawdesk-v1' : (process.env.MINIMAX_MODEL || 'MiniMax-M3')

        function extractAssistantContent(respObj: any) {
            if (!respObj) return ''
            try {
                // common shapes
                if (respObj.choices && Array.isArray(respObj.choices) && respObj.choices[0]) {
                    const c = respObj.choices[0]
                    if (c.message && typeof c.message.content === 'string') return c.message.content
                    if (typeof c.text === 'string') return c.text
                    if (c.delta && typeof c.delta.content === 'string') return c.delta.content
                }
                // OpenAI-style top-level message
                if (respObj.data && Array.isArray(respObj.data) && respObj.data[0] && typeof respObj.data[0].content === 'string') return respObj.data[0].content
                // fallback to stringify
                return typeof respObj === 'string' ? respObj : JSON.stringify(respObj)
            } catch (e) {
                return ''
            }
        }

        function normalizeParsed(parsed: any) {
            if (parsed === null || parsed === undefined) return []
            if (Array.isArray(parsed)) return parsed
            if (typeof parsed === 'string') return [parsed]
            if (typeof parsed === 'object') {
                // try to find first array value inside object
                for (const k of Object.keys(parsed)) {
                    if (Array.isArray(parsed[k])) return parsed[k]
                }
                // otherwise wrap object
                return [parsed]
            }
            return [parsed]
        }

        function isUnsafeEvidenceTitle(value: string) {
            const text = String(value || '').trim()
            if (!text) return true
            if (text.startsWith('{') || text.startsWith('[')) return true
            if (/mock summary for matter unknown/i.test(text)) return true
            return false
        }

        function isGenericSummaryObject(value: any) {
            if (!value || typeof value !== 'object' || Array.isArray(value)) return false
            return (
                'summary' in value
                || 'risks' in value
                || 'missing_items' in value
                || 'next' in value
                || 'next_steps' in value
                || 'lawyer_actions' in value
            )
        }

        function normalizeEvidenceCandidates(items: any[]) {
            const normalized: Array<{ title: string; description?: string; evidence_type?: string; relevance?: string; material_id?: string }> = []

            for (const item of items) {
                if (typeof item === 'string') {
                    const title = item.trim()
                    if (!isUnsafeEvidenceTitle(title)) normalized.push({ title })
                    continue
                }

                if (!item || typeof item !== 'object' || Array.isArray(item)) continue
                if (isGenericSummaryObject(item)) continue

                const title = String(item.title || item.name || '').trim()
                if (isUnsafeEvidenceTitle(title)) continue

                const evidence: { title: string; description?: string; evidence_type?: string; relevance?: string; material_id?: string } = { title }
                if (typeof item.description === 'string' && item.description.trim()) evidence.description = item.description.trim()
                if (typeof item.proof_purpose === 'string' && item.proof_purpose.trim()) evidence.description = item.proof_purpose.trim()
                if (typeof item.evidence_type === 'string' && item.evidence_type.trim()) evidence.evidence_type = item.evidence_type.trim()
                if (typeof item.type === 'string' && item.type.trim()) evidence.evidence_type = item.type.trim()
                if (typeof item.relevance === 'string' && item.relevance.trim()) evidence.relevance = item.relevance.trim()
                if (typeof item.material_id === 'string' && item.material_id.trim()) evidence.material_id = item.material_id.trim()
                normalized.push(evidence)
            }

            return normalized
        }

        const adapter = this.adapter

        async function callStep(name: string, userPrompt: string) {
            const system = '你是资深律师助理，输出仅包含 JSON 或可解析的 JSON 文本，用于开发测试。不要输出解释性文本。'
            const promptPack = { system_prompt: system, user_prompt: `${userPrompt}\n\n案件摘要：\n${caseSummary}` }
            const resp = await adapter.generate(promptPack)
            raw[name] = resp
            if (resp?.provider) provider = String(resp.provider)
            if (resp?.model) model = String(resp.model)
            if (resp && resp.fallback) fallback_used = true

            const responseObj = resp && resp.response ? resp.response : resp
            const text = extractAssistantContent(responseObj)

            if (!text || text.length === 0) {
                // no assistant text found; if this was a fallback empty response, mark as fallback_empty
                if (resp && resp.fallback) {
                    return { parsed: null, parsed_array: [], raw_text: text || JSON.stringify(responseObj), parse_meta: { ok: false, error: 'fallback_empty', raw: responseObj } }
                }
                return { parsed: null, parsed_array: [], raw_text: text || JSON.stringify(responseObj), parse_meta: { ok: false, error: 'no_assistant_content', raw: responseObj } }
            }

            const parsed = parseAIJson(text)
            const normalized = parsed.ok ? normalizeParsed(parsed.data) : []

            // If parsed succeeded but produced an empty array, treat as parse failure so callers don't silently accept []
            const parse_meta: any = parsed.ok ? { ...parsed } : { ...parsed }
            if (parsed.ok && Array.isArray(normalized) && normalized.length === 0) {
                parse_meta.ok = false
                parse_meta.error = parse_meta.error || 'empty parsed array'
            }

            return { parsed: parsed.ok ? parsed.data : null, parsed_array: normalized, raw_text: text, parse_meta }
        }

        const ev = await callStep('evidence', '请基于案件摘要，列出可能的证据项数组，返回 JSON 数组，例如:["转账记录","微信聊天记录"]')
        if (ev.parse_meta && ev.parse_meta.ok && Array.isArray(ev.parsed_array) && ev.parsed_array.length > 0) {
            steps.evidence = normalizeEvidenceCandidates(ev.parsed_array)
        } else {
            steps.evidence = []
        }

        const fa = await callStep('facts', '请基于案件摘要，抽取关键事实（要点化），以 JSON 数组返回，例如:["借款时间","借款金额"]')
        if (fa.parse_meta && fa.parse_meta.ok && Array.isArray(fa.parsed_array) && fa.parsed_array.length > 0) {
            steps.facts = fa.parsed_array
        } else if (fa.raw_text && fa.raw_text.length > 0) {
            steps.facts = [fa.raw_text]
        } else {
            steps.facts = []
        }

        const is = await callStep('issues', '请基于案件摘要，列出法律争议点（Issue）数组，返回 JSON 数组，例如:["是否构成借款合同","是否存在还款义务"]')
        if (is.parse_meta && is.parse_meta.ok && Array.isArray(is.parsed_array) && is.parsed_array.length > 0) {
            steps.issues = is.parsed_array
        } else if (is.raw_text && is.raw_text.length > 0) {
            steps.issues = [is.raw_text]
        } else {
            steps.issues = []
        }

        const la = await callStep('laws', '请基于案件摘要和争议点，列出可能适用的法律条文或法理，以 JSON 数组返回，例如:[{"code":"合同法第...","summary":"..."}]')
        if (la.parse_meta && la.parse_meta.ok && Array.isArray(la.parsed_array) && la.parsed_array.length > 0) {
            steps.laws = la.parsed_array
        } else if (la.raw_text && la.raw_text.length > 0) {
            steps.laws = [la.raw_text]
        } else {
            steps.laws = []
        }

        const ag = await callStep('arguments', '请基于事实和法律，草拟主要法律论点（要点），以 JSON 数组返回，例如:[{"side":"原告","point":"..."}]')
        if (ag.parse_meta && ag.parse_meta.ok && Array.isArray(ag.parsed_array) && ag.parsed_array.length > 0) {
            steps.arguments = ag.parsed_array
        } else if (ag.raw_text && ag.raw_text.length > 0) {
            steps.arguments = [ag.raw_text]
        } else {
            steps.arguments = []
        }

        const doc = await callStep('documents', '请基于案件摘要和论点，生成文书建议（例如 起诉状 标题和要点），以 JSON 数组返回，每项包含 "type" 和 "content" 字段')
        if (doc.parse_meta && doc.parse_meta.ok && Array.isArray(doc.parsed_array) && doc.parsed_array.length > 0) {
            steps.documents = doc.parsed_array
        } else if (doc.raw_text && doc.raw_text.length > 0) {
            steps.documents = [{ type: 'raw', content: doc.raw_text }]
        } else {
            steps.documents = []
        }

        const validation: any = { evidence: undefined, facts: undefined, issues: undefined, laws: undefined, arguments: undefined, documents: undefined }
        try { validation.evidence = ev ? ev.parse_meta : undefined } catch (_) { }
        try { validation.facts = fa ? fa.parse_meta : undefined } catch (_) { }
        try { validation.issues = is ? is.parse_meta : undefined } catch (_) { }
        try { validation.laws = la ? la.parse_meta : undefined } catch (_) { }
        try { validation.arguments = ag ? ag.parse_meta : undefined } catch (_) { }
        try { validation.documents = doc ? doc.parse_meta : undefined } catch (_) { }

        // if fallback used AND at least one step had fallback_empty, surface top-level error
        let error: string | undefined = undefined
        try {
            const metas = [validation.evidence, validation.facts, validation.issues, validation.laws, validation.arguments, validation.documents]
            const hasFallbackEmpty = metas.some((m: any) => m && m.error === 'fallback_empty')
            if (fallback_used && hasFallbackEmpty) {
                error = 'AI provider unavailable or empty fallback response'
            }
        } catch (_) { }

        const res: any = { provider, model, steps, raw, validation, fallback_used }
        if (error) res.error = error
        return res
    }
}
