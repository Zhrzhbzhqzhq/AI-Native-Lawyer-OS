import type { FastifyInstance } from 'fastify'
import MiniMaxAdapter from '../ai/minimaxAdapter'

export default async function aiRoutes(app: FastifyInstance) {
    // GET /ai/health - lightweight configuration check (no external calls)
    app.get('/ai/health', async (request, reply) => {
        const provider = process.env.AI_PROVIDER || 'minimax'
        const model = process.env.AI_MODEL || process.env.MINIMAX_MODEL || 'MiniMax-M3'
        return reply.code(200).send({ configured: true, provider, model })
    })

    app.post('/ai/health-check', async (request, reply) => {
        const provider = process.env.AI_PROVIDER || 'minimax'
        const baseUrlEnv = process.env.MINIMAX_BASE_URL?.replace(/\s+/g, "").trim()
        const model = process.env.MINIMAX_MODEL || 'MiniMax-M3'
        const hasApiKey = Boolean(process.env.MINIMAX_API_KEY)

        // Environment checks are returned in the response; avoid noisy console output in production

        // Validate required envs before attempting external requests
        if (!baseUrlEnv || baseUrlEnv.trim() === '') {
            return reply.code(400).send({ status: 'FAIL', error: 'MINIMAX_BASE_URL not configured' })
        }
        if (!hasApiKey) {
            return reply.code(400).send({ status: 'FAIL', error: 'MINIMAX_API_KEY not configured' })
        }

        // fixed prompt required by spec
        const system = 'You are a system assistant.'
        const user = 'Return only JSON:\n{ "status":"ok", "provider":"", "model":"" }'

        const adapter = new MiniMaxAdapter()

        const start = Date.now()
        try {
            const resp = await adapter.generate({ system_prompt: system, user_prompt: user })
            const latency = Date.now() - start

            // prepare raw_response safely: do not include any headers or api key
            const safeRaw = resp && resp.response ? resp.response : null

            const out = {
                provider: resp && resp.provider ? resp.provider : provider,
                model: resp && resp.model ? resp.model : model,
                base_url: baseUrlEnv,
                has_api_key: hasApiKey,
                status: resp && resp.response ? 'ok' : (resp && resp.fallback ? 'fallback' : 'error'),
                latency_ms: latency,
                raw_response: safeRaw,
                error: resp && resp.error ? resp.error : null,
            }

            // Do not leak API keys or Authorization headers
            return reply.code(200).send(out)
        } catch (err: any) {
            const latency = Date.now() - start
            return reply.code(500).send({ provider, model, base_url: baseUrlEnv, has_api_key: hasApiKey, status: 'error', latency_ms: latency, raw_response: null, error: err?.message || String(err) })
        }
    })

    // POST /ai/test - development test endpoint to exercise the configured provider
    // Accepts { prompt: string } and returns { text, provider, model }
    app.post('/ai/test', async (request, reply) => {
        if (process.env.NODE_ENV === 'production') return reply.code(404).send()
        const body: any = request.body || {}
        const prompt = String(body.prompt || '').trim()
        if (!prompt) return reply.code(400).send({ error: 'prompt required' })

        const provider = (process.env.AI_PROVIDER || 'minimax').toLowerCase()
        const model = process.env.AI_MODEL || process.env.MINIMAX_MODEL || 'MiniMax-M3'

        try {
            const Adapter = (await import('../ai/minimaxAdapter')).default
            const adapter = new Adapter()
            const resp = await adapter.generate({ user_prompt: prompt })

            // extract text from common response shapes
            let text = ''
            try {
                const r = resp && resp.response ? resp.response : null
                if (r && r.choices && Array.isArray(r.choices) && r.choices[0]) {
                    const c = r.choices[0]
                    if (c.message && typeof c.message.content === 'string') text = c.message.content
                    else if (typeof c.text === 'string') text = c.text
                }
            } catch (_e) { text = '' }

            // If adapter fell back to mock, try to surface provider/model hints
            const outProvider = resp && resp.provider ? resp.provider : provider
            const outModel = resp && resp.model ? resp.model : model

            return reply.code(200).send({ text, provider: outProvider, model: outModel })
        } catch (err: any) {
            return reply.code(500).send({ error: err?.message || String(err) })
        }
    })

    app.post('/ai/playground', async (request, reply) => {
        // Hide playground in production to avoid exposing a dev tool
        if (process.env.NODE_ENV === 'production') {
            return reply.code(404).send()
        }
        const body: any = request.body as any || {}
        const caseSummary = (body.case_summary || '').toString()
        const provider = process.env.AI_PROVIDER || 'minimax'
        const model = process.env.MINIMAX_MODEL || 'MiniMax-M3'
        const Adapter = (await import('../ai/minimaxAdapter')).default
        const adapter = new Adapter()

        const steps = {
            evidence: [],
            facts: [],
            issues: [],
            laws: [],
            arguments: [],
            documents: [] as any[],
        }

        const raw: Record<string, any> = {}
        const validation: any = { facts: {}, laws: {}, arguments: {}, documents: {} }
        let fallback_used = false

        const startAll = Date.now()

        // helper to call adapter and attempt to extract JSON payload from assistant text
        async function callStep(name: string, userPrompt: string) {
            const system = '你是资深律师助理，输出仅包含 JSON 或可解析的 JSON 文本，用于开发测试。不要输出解释性文本。'
            const promptPack = { system_prompt: system, user_prompt: `${userPrompt}\n\n案件摘要：\n${caseSummary}` }
            const resp = await adapter.generate(promptPack)
            raw[name] = resp
            if (resp && resp.fallback) fallback_used = true

            // try to extract assistant text
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

            // If adapter returned an explicit error object, surface as parse failure
            try {
                const responseObj = resp && resp.response ? resp.response : null
                if (responseObj && (responseObj.type === 'error' || responseObj.error)) {
                    const errMessage = (responseObj.error && (responseObj.error.message || responseObj.error.msg)) || JSON.stringify(responseObj.error || responseObj)
                    return { parsed: null, raw_text: text || JSON.stringify(responseObj), parse_meta: { ok: false, error: errMessage, raw: responseObj } }
                }
            } catch (_e) {
                // ignore
            }

            // attempt JSON parse using shared parser on the assistant content (prefer message content)
            try {
                const { default: parseAIJson } = await import('../services/ai/AIJsonParser')
                const contentToParse = (text && text.length > 0) ? text : (resp && resp.response ? resp.response : '')
                const parsed = parseAIJson(contentToParse)
                return { parsed: parsed.ok ? parsed.data : null, raw_text: text, parse_meta: parsed }
            } catch (_e) {
                return { parsed: null, raw_text: text }
            }
        }

        try {
            // evidence
            const ev = await callStep('evidence', '请基于案件摘要，列出可能的证据项数组，返回 JSON 数组，例如:["转账记录","微信聊天记录"]')
            steps.evidence = ev.parsed || (ev.raw_text ? [ev.raw_text] : [])

            // facts
            const fa = await callStep('facts', '请基于案件摘要，抽取关键事实（要点化），以 JSON 数组返回，例如:["借款时间","借款金额"]')
            steps.facts = fa.parsed || (fa.raw_text ? [fa.raw_text] : [])
            validation.facts = fa.parse_meta || { parsed: Boolean(fa.parsed) }

            // issues
            const is = await callStep('issues', '请基于案件摘要，列出法律争议点（Issue）数组，返回 JSON 数组，例如:["是否构成借款合同","是否存在还款义务"]')
            steps.issues = is.parsed || (is.raw_text ? [is.raw_text] : []);
            (validation as any).issues = is.parse_meta || { parsed: !!is.parsed }

            // laws
            const la = await callStep('laws', '请基于案件摘要和争议点，列出可能适用的法律条文或法理，以 JSON 数组返回，例如:[{"code":"合同法第...","summary":"..."}]')
            steps.laws = la.parsed || (la.raw_text ? [la.raw_text] : [])
            validation.laws = la.parse_meta || { parsed: Boolean(la.parsed) }

            // arguments
            const ag = await callStep('arguments', '请基于事实和法律，草拟主要法律论点（要点），以 JSON 数组返回，例如:[{"side":"原告","point":"..."}]')
            steps.arguments = ag.parsed || (ag.raw_text ? [ag.raw_text] : [])
            validation.arguments = ag.parse_meta || { parsed: Boolean(ag.parsed) }

            // documents
            const doc = await callStep('documents', '请基于案件摘要和论点，生成文书建议（例如 起诉状 标题和要点），以 JSON 数组返回，每项包含 "type" 和 "content" 字段')
            steps.documents = doc.parsed || (doc.raw_text ? [{ type: 'raw', content: doc.raw_text }] : [])
            validation.documents = doc.parse_meta || { parsed: Boolean(doc.parsed) }

            const totalLatency = Date.now() - startAll

            return reply.code(200).send({ provider, model, latency_ms: totalLatency, steps, validation, fallback_used, raw })
        } catch (err: any) {
            const totalLatency = Date.now() - startAll
            return reply.code(500).send({ provider, model, latency_ms: totalLatency, steps, validation, fallback_used, raw, error: err?.message || String(err) })
        }
    })

}
