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

        async function callStep(name: string, userPrompt: string) {
            const system = '你是资深律师助理，输出仅包含 JSON 或可解析的 JSON 文本，用于开发测试。不要输出解释性文本。'
            const promptPack = { system_prompt: system, user_prompt: `${userPrompt}\n\n案件摘要：\n${caseSummary}` }
            const resp = await (new MiniMaxAdapter()).generate(promptPack)
            raw[name] = resp
            if (resp && resp.fallback) fallback_used = true

            let text = ''
            try {
                if (resp && resp.response && resp.response.choices && resp.response.choices[0] && resp.response.choices[0].message && resp.response.choices[0].message.content) {
                    text = resp.response.choices[0].message.content
                } else if (resp && resp.response && resp.response.choices && resp.response.choices[0] && resp.response.choices[0].text) {
                    text = resp.response.choices[0].text
                }
            } catch (_e) {
                text = ''
            }

            // handle adapter error-style responses
            const responseObj = resp && resp.response ? resp.response : null
            if (responseObj && (responseObj.type === 'error' || responseObj.error)) {
                return { parsed: null, raw_text: text || JSON.stringify(responseObj), parse_meta: { ok: false, error: (responseObj.error && (responseObj.error.message || responseObj.error.msg)) || JSON.stringify(responseObj.error || responseObj), raw: responseObj } }
            }

            const contentToParse = (text && text.length > 0) ? text : (resp && resp.response ? resp.response : '')
            const parsed = parseAIJson(contentToParse)
            return { parsed: parsed.ok ? parsed.data : null, raw_text: text, parse_meta: parsed }
        }

        const ev = await callStep('evidence', '请基于案件摘要，列出可能的证据项数组，返回 JSON 数组，例如:["转账记录","微信聊天记录"]')
        steps.evidence = ev.parsed || (ev.raw_text ? [ev.raw_text] : [])
        const fa = await callStep('facts', '请基于案件摘要，抽取关键事实（要点化），以 JSON 数组返回，例如:["借款时间","借款金额"]')
        steps.facts = fa.parsed || (fa.raw_text ? [fa.raw_text] : [])
        const is = await callStep('issues', '请基于案件摘要，列出法律争议点（Issue）数组，返回 JSON 数组，例如:["是否构成借款合同","是否存在还款义务"]')
        steps.issues = is.parsed || (is.raw_text ? [is.raw_text] : [])
        const la = await callStep('laws', '请基于案件摘要和争议点，列出可能适用的法律条文或法理，以 JSON 数组返回，例如:[{"code":"合同法第...","summary":"..."}]')
        steps.laws = la.parsed || (la.raw_text ? [la.raw_text] : [])
        const ag = await callStep('arguments', '请基于事实和法律，草拟主要法律论点（要点），以 JSON 数组返回，例如:[{"side":"原告","point":"..."}]')
        steps.arguments = ag.parsed || (ag.raw_text ? [ag.raw_text] : [])
        const doc = await callStep('documents', '请基于案件摘要和论点，生成文书建议（例如 起诉状 标题和要点），以 JSON 数组返回，每项包含 "type" 和 "content" 字段')
        steps.documents = doc.parsed || (doc.raw_text ? [{ type: 'raw', content: doc.raw_text }] : [])

        return { provider: 'minimax', model: process.env.MINIMAX_MODEL || 'MiniMax-M3', steps, raw, validation: { facts: fa.parse_meta, laws: la.parse_meta, arguments: ag.parse_meta, documents: doc.parse_meta }, fallback_used }
    }
}
