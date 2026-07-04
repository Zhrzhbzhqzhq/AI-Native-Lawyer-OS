import type LlmAdapter from './llmAdapter'

export class MiniMaxAnthropicAdapter implements LlmAdapter {
  baseUrl: string
  authMode: string
  apiKey?: string
  model: string

  constructor() {
    this.apiKey = process.env.MINIMAX_API_KEY
    this.authMode = (process.env.MINIMAX_AUTH_MODE || 'api_key').toLowerCase()

      if (process.env.MINIMAX_BASE_URL && process.env.MINIMAX_BASE_URL.trim() !== '') {
        this.baseUrl = process.env.MINIMAX_BASE_URL.replace(/\/+$/, '')
      } else if (process.env.MINIMAX_TOKEN_BASE_URL && process.env.MINIMAX_TOKEN_BASE_URL.trim() !== '') {
        this.baseUrl = process.env.MINIMAX_TOKEN_BASE_URL.replace(/\/+$/, '')
      } else {
        const region = (process.env.MINIMAX_REGION || 'global').toLowerCase()
        if (region === 'cn') {
          this.baseUrl = 'https://api.minimaxi.com'
        } else {
          this.baseUrl = 'https://api.minimax.io'
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
        notes: 'MINIMAX_API_KEY missing, fallback to mock (anthropic adapter)',
      }
    }

    const system_prompt = promptPack.system_prompt ?? promptPack.systemPrompt ?? ''
    const user_prompt = promptPack.user_prompt ?? promptPack.userPrompt ?? ''
    const prompt = (system_prompt ? `System: ${system_prompt}\n` : '') + `User: ${user_prompt}`

      const payload = {
        model: this.model,
        max_tokens: 1200,
        system: system_prompt,
        messages: [
          {
            role: 'user',
            content: user_prompt,
          },
        ],
        temperature: 0.2,
      }

      const url = `${this.baseUrl}/anthropic/v1/messages`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    }

    let fetcher: any
    try {
      fetcher = (globalThis as any).fetch ?? (await import('node-fetch')).default
    } catch (_e) {
      fetcher = (globalThis as any).fetch
    }

    const resp = await fetcher(url, { method: 'POST', headers, body: JSON.stringify(payload) })
    const json = await resp.json()

    return {
      provider: 'minimax',
      model: this.model,
      response: json,
      payload_sent: payload,
      endpoint: url,
    }
  }
}

export default MiniMaxAnthropicAdapter
