import MiniMaxAdapter from '../../ai/minimaxAdapter'
import parseAIJson from './AIJsonParser'

export default class AIPipelineService {
    adapter: MiniMaxAdapter

    constructor() {
        this.adapter = new MiniMaxAdapter()
    }

    async run(caseSummary: string) {
        const steps: any = { evidence: [], facts: [], issues: [], laws: [], arguments: [], documents: [] }
        const raw: any = {}
        let fallback_used = false

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

        async function callStep(name: string, userPrompt: string) {
            const system = '你是资深律师助理，输出仅包含 JSON 或可解析的 JSON 文本，用于开发测试。不要输出解释性文本。'
            const promptPack = { system_prompt: system, user_prompt: `${userPrompt}\n\n案件摘要：\n${caseSummary}` }
            const resp = await (new MiniMaxAdapter()).generate(promptPack)
            raw[name] = resp
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
            return { parsed: parsed.ok ? parsed.data : null, parsed_array: normalized, raw_text: text, parse_meta: parsed }
        }

        const ev = await callStep('evidence', '请基于案件摘要，列出可能的证据项数组，返回 JSON 数组，例如:["转账记录","微信聊天记录"]')
        steps.evidence = ev.parsed_array || (ev.raw_text ? [ev.raw_text] : [])
        const fa = await callStep('facts', '请基于案件摘要，抽取关键事实（要点化），以 JSON 数组返回，例如:["借款时间","借款金额"]')
        steps.facts = fa.parsed_array || (fa.raw_text ? [fa.raw_text] : [])
        const is = await callStep('issues', '请基于案件摘要，列出法律争议点（Issue）数组，返回 JSON 数组，例如:["是否构成借款合同","是否存在还款义务"]')
        steps.issues = is.parsed_array || (is.raw_text ? [is.raw_text] : [])
        const la = await callStep('laws', '请基于案件摘要和争议点，列出可能适用的法律条文或法理，以 JSON 数组返回，例如:[{"code":"合同法第...","summary":"..."}]')
        steps.laws = la.parsed_array || (la.raw_text ? [la.raw_text] : [])
        const ag = await callStep('arguments', '请基于事实和法律，草拟主要法律论点（要点），以 JSON 数组返回，例如:[{"side":"原告","point":"..."}]')
        steps.arguments = ag.parsed_array || (ag.raw_text ? [ag.raw_text] : [])
        const doc = await callStep('documents', '请基于案件摘要和论点，生成文书建议（例如 起诉状 标题和要点），以 JSON 数组返回，每项包含 "type" 和 "content" 字段')
        steps.documents = doc.parsed_array || (doc.raw_text ? [{ type: 'raw', content: doc.raw_text }] : [])

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

        const res: any = { provider: 'minimax', model: process.env.MINIMAX_MODEL || 'MiniMax-M3', steps, raw, validation, fallback_used }
        if (error) res.error = error
        return res
    }
}
