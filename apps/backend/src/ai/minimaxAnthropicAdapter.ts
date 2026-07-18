import type LlmAdapter from './llmAdapter'
import { createAIAudit } from '../services/ai/aiAudit'

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
    const start = Date.now()
    const promptVersion = typeof promptPack.prompt_version === 'string' && promptPack.prompt_version.trim()
      ? promptPack.prompt_version.trim()
      : 'legacy-ai-v1'
    if (!this.apiKey) {
      throw new Error('ai_provider_key_missing:minimax')
    }

    const system_prompt = promptPack.system_prompt ?? promptPack.systemPrompt ?? ''
    const user_prompt = promptPack.user_prompt ?? promptPack.userPrompt ?? ''
      const maxTokens = promptPack.task === 'analyze_laws'
        || promptVersion === 'law-draft-v1'
        || promptPack.task === 'analyze_arguments'
        || promptVersion === 'argument-draft-v1'
        ? 4000
        : 1200
      const payload = {
        model: this.model,
        max_tokens: maxTokens,
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

    let resp: any
    let json: any
    try {
      resp = await fetcher(url, { method: 'POST', headers, body: JSON.stringify(payload) })
      json = await resp.json()
    } catch (error: any) {
      throw new Error(`ai_provider_request_failed:minimax:${error?.message || 'network_error'}`)
    }
    if (!resp.ok) throw new Error(`ai_provider_request_failed:minimax:http_${resp.status}`)
    const usage = json && json.usage ? json.usage : null
    const cost = json && typeof json.cost === 'number' ? json.cost : (json && json.billing && typeof json.billing.cost === 'number' ? json.billing.cost : null)
    const duration = Date.now() - start
    try {
      const { logAIRequest } = await import('../services/ai/aiRuntimeLogger')
      logAIRequest({
        provider: 'minimax',
        model: this.model,
        matter_id: promptPack && promptPack.matter_id,
        workspace: promptPack && promptPack.task,
        duration_ms: duration,
        prompt_tokens: usage && typeof usage.input_tokens === 'number' ? usage.input_tokens : (usage && typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : null),
        completion_tokens: usage && typeof usage.output_tokens === 'number' ? usage.output_tokens : (usage && typeof usage.completion_tokens === 'number' ? usage.completion_tokens : null),
        retry: 0,
        cost,
        fallback: false,
        prompt_version: promptVersion,
      })
    } catch (_e) {
      // ignore
    }

    return {
      provider: 'minimax',
      model: this.model,
      response: json,
      endpoint: url,
      usage,
      cost,
      duration_ms: duration,
      attempts: 1,
      fallback: false,
      fallback_used: false,
      prompt_version: promptVersion,
      ai_audit: createAIAudit('minimax', this.model, promptVersion),
    }
  }
}

export default MiniMaxAnthropicAdapter
