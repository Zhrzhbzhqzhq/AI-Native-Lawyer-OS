import type { FastifyInstance } from 'fastify'
import MiniMaxAdapter from '../ai/minimaxAdapter'

export default async function aiRoutes(app: FastifyInstance) {
    app.post('/ai/health-check', async (request, reply) => {
        const provider = process.env.AI_PROVIDER || 'minimax'
        const baseUrlEnv = process.env.MINIMAX_BASE_URL?.replace(/\s+/g, "").trim()
        const model = process.env.MINIMAX_MODEL || 'MiniMax-M3'
        const hasApiKey = Boolean(process.env.MINIMAX_API_KEY)

        // Debug prints for environment (safe: do not print API key value)
        console.log('[ai/health-check] AI_PROVIDER=', process.env.AI_PROVIDER)
        console.log('[ai/health-check] MINIMAX_BASE_URL=', process.env.MINIMAX_BASE_URL)
        console.log('[ai/health-check] MINIMAX_MODEL=', process.env.MINIMAX_MODEL)
        console.log('[ai/health-check] MINIMAX_API_KEY_PRESENT=', Boolean(process.env.MINIMAX_API_KEY))

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
}
