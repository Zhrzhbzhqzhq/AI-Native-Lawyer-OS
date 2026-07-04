import type LlmAdapter from './llmAdapter'

export class MiniMaxAdapter implements LlmAdapter {
  baseUrl: string
  authMode: string
  apiKey?: string
  model: string

  constructor() {
    this.apiKey = process.env.MINIMAX_API_KEY
    // Auth mode may affect how the adapter authenticates or which endpoint to use.
    this.authMode = (process.env.MINIMAX_AUTH_MODE || 'api_key').toLowerCase()

    // Determine base URL precedence (highest to lowest):
    // 1. MINIMAX_BASE_URL explicit override
    // 2. For token_plan: MINIMAX_TOKEN_BASE_URL explicit override
    // 3. MINIMAX_REGION -> 'cn' uses https://api.minimaxi.com/v1, 'global' uses https://api.minimax.io/v1
    // 4. default to global
    if (process.env.MINIMAX_BASE_URL && process.env.MINIMAX_BASE_URL.trim() !== '') {
      this.baseUrl = process.env.MINIMAX_BASE_URL
    } else if (this.authMode === 'token_plan' && process.env.MINIMAX_TOKEN_BASE_URL && process.env.MINIMAX_TOKEN_BASE_URL.trim() !== '') {
      this.baseUrl = process.env.MINIMAX_TOKEN_BASE_URL
    } else {
      const region = (process.env.MINIMAX_REGION || 'global').toLowerCase()
      if (region === 'cn') {
        this.baseUrl = 'https://api.minimaxi.com/v1'
      } else {
        this.baseUrl = 'https://api.minimax.io/v1'
      }
    }
    this.model = process.env.MINIMAX_MODEL ?? 'MiniMax-M3'
  }

  async generate(promptPack: any) {
    // If no API key, signal fallback to mock via provider flag
    if (!this.apiKey) {
      return {
        provider: 'mock',
        model: 'mock-lawdesk-v1',
        response: {},
        notes: 'MINIMAX_API_KEY missing, fallback to mock',
      }
    }

    const system_prompt = promptPack.system_prompt ?? promptPack.systemPrompt ?? ''
    const user_prompt = promptPack.user_prompt ?? promptPack.userPrompt ?? ''

    const payload = {
      model: this.model,
      messages: [
        { role: 'system', content: system_prompt },
        { role: 'user', content: user_prompt },
      ],
      temperature: 0.2,
      max_completion_tokens: 1200,
      thinking: { type: 'disabled' },
    }

    const url = `${this.baseUrl.replace(/\/+$/,'')}/chat/completions`

    const headers: Record<string,string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    }

    // perform fetch; environment may not have global fetch in tests, so use node's fetch if available
    let fetcher: any
    try {
      fetcher = (globalThis as any).fetch ?? (await import('node-fetch')).default
    } catch (_e) {
      // fallback to global fetch if import not available; tests will stub network
      fetcher = (globalThis as any).fetch
    }

    const resp = await fetcher(url, { method: 'POST', headers, body: JSON.stringify(payload) })
    const json = await resp.json()

    return {
      provider: 'minimax',
      model: this.model,
      response: json,
      payload_sent: payload,
    }
  }
}

export default MiniMaxAdapter
