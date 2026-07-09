import ProviderManager from '../apps/backend/src/ai/providerManager'

async function run() {
    console.log('AI_PROVIDER:', process.env.AI_PROVIDER || '(unset)')
    console.log('MINIMAX_API_KEY present:', !!process.env.MINIMAX_API_KEY)
    console.log('MINIMAX_BASE_URL:', process.env.MINIMAX_BASE_URL || '(default)')
    console.log('MINIMAX_MODEL:', process.env.MINIMAX_MODEL || '(default MiniMax-M3)')
    console.log('AI_PROVIDER_TIMEOUT_MS:', process.env.AI_PROVIDER_TIMEOUT_MS || 45000)
    console.log('PROMPT_VERSION:', process.env.PROMPT_VERSION || 'v1')

    let adapter: any = null
    try {
        adapter = ProviderManager.getAdapter()
    } catch (e: any) {
        console.error('ProviderManager.getAdapter threw:')
        console.error(e && e.stack ? e.stack : e)
        process.exit(1)
    }

    console.log('Adapter constructor:', adapter && adapter.constructor && adapter.constructor.name)

    // If MiniMaxAdapter, instrument fetch to log request and response details
    if (adapter && adapter.constructor && String(adapter.constructor.name).toLowerCase().includes('minimax')) {
        console.log('Detected MiniMax adapter; will instrument fetch to capture HTTP details')

        let originalFetch: any = (globalThis as any).fetch
        if (!originalFetch) {
            try {
                originalFetch = (await import('node-fetch')).default
            } catch (e) {
                originalFetch = undefined
            }
        }

        if (!originalFetch) {
            console.error('No fetch available to instrument; aborting HTTP capture')
        } else {
            (globalThis as any).fetch = async (url: any, opts: any) => {
                try {
                    console.error('\n--- Outgoing Request ---')
                    console.error('Request URL:', url)
                    try {
                        const body = opts && opts.body ? opts.body : null
                        if (body) {
                            let parsed = null
                            try { parsed = JSON.parse(body) } catch (e) { parsed = null }
                            console.error('Payload (raw):', body)
                            console.error('Model in payload:', parsed && parsed.model ? parsed.model : '(not found)')
                            console.error('User prompt excerpt:', parsed && parsed.messages && parsed.messages[1] && parsed.messages[1].content ? String(parsed.messages[1].content).slice(0, 200) : '(none)')
                        }
                    } catch (e) {
                        console.error('Error inspecting request body:', e && e.stack ? e.stack : e)
                    }

                    const headers = opts && opts.headers ? opts.headers : {}
                    console.error('Authorization header:', headers && (headers.Authorization || headers.authorization) ? (headers.Authorization || headers.authorization) : '(none)')
                    console.error('Timeout (ms):', process.env.AI_PROVIDER_TIMEOUT_MS || 45000)

                    const resp = await originalFetch(url, opts)

                    console.error('\n--- Incoming Response ---')
                    console.error('status:', resp.status)
                    try {
                        const hObj: any = {}
                        resp.headers && (async () => {
                            try {
                                for (const [k, v] of resp.headers.entries()) {
                                    hObj[k] = v
                                }
                            } catch (err) {
                                // ignore
                            }
                        })()
                        console.error('headers:', '(see raw below)')
                        try {
                            const text = await resp.text()
                            console.error('body (raw):')
                            console.error(text)

                            // try to parse JSON to inspect choices
                            try {
                                const j = JSON.parse(text)
                                console.error('body parsed as JSON')
                                if (j.choices && Array.isArray(j.choices) && j.choices[0] && j.choices[0].message) {
                                    console.error('choices[0].message.content (raw):')
                                    console.error(j.choices[0].message.content)
                                }
                            } catch (parseErr: any) {
                                console.error('JSON.parse error:')
                                console.error(parseErr && parseErr.stack ? parseErr.stack : parseErr)
                                // show substring attempts
                                try {
                                    const txt = text
                                    const start = txt.indexOf('{')
                                    const substr = start >= 0 ? txt.slice(start, start + 2000) : txt.slice(0, 2000)
                                    console.error('substring for debugging (first 2000 chars from first {):')
                                    console.error(substr)
                                } catch (se) {
                                    console.error('substring extraction failed', se && se.stack ? se.stack : se)
                                }
                            }

                            // return a new Response constructed from text for caller
                            const { Response } = await import('node-fetch')
                            return new Response(text, { status: resp.status, headers: resp.headers })
                        } catch (bodyErr) {
                            console.error('Error reading body:', bodyErr && bodyErr.stack ? bodyErr.stack : bodyErr)
                        }

                    } catch (rErr) {
                        console.error('Error handling response:', rErr && rErr.stack ? rErr.stack : rErr)
                    }

                    return resp
                } catch (outerErr) {
                    console.error('fetch wrapper caught error:')
                    console.error(outerErr && outerErr.stack ? outerErr.stack : outerErr)
                    throw outerErr
                }
            }
        }
    }

    // Try to call adapter.generate with a minimal promptPack to trigger behavior
    try {
        const promptPack: any = {
            task: 'diagnostic_ping',
            matter_id: 'diag-matter-000',
            context_pack: { matter: { matter_id: 'diag-matter-000', title: 'diag' } },
            user_prompt: 'DIAGNOSTIC PING - return minimal JSON array',
            created_at: new Date().toISOString(),
        }

        console.log('\nInvoking adapter.generate(...)')
        const resp = await adapter.generate(promptPack)
        console.log('Adapter.generate returned object keys:', Object.keys(resp || {}))
        console.log('Full adapter response (stringified):', JSON.stringify(resp, null, 2))
    } catch (e: any) {
        console.error('adapter.generate threw:')
        console.error(e && e.stack ? e.stack : e)
    }
}

run().catch((e) => { console.error('run() top-level error:'); console.error(e && e.stack ? e.stack : e); process.exit(1) })
