import type LlmAdapter from './llmAdapter'
import { createAIAudit } from '../services/ai/aiAudit'

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
      // sanitize whitespace/newlines from env
      this.baseUrl = process.env.MINIMAX_BASE_URL.replace(/\s+/g, '').trim()
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
    const promptVersion = typeof promptPack.prompt_version === 'string' && promptPack.prompt_version.trim()
      ? promptPack.prompt_version.trim()
      : 'legacy-ai-v1'

    if (!this.apiKey) {
      throw new Error('ai_provider_key_missing:minimax')
    }

    const system_prompt = promptPack.system_prompt ?? promptPack.systemPrompt ?? ''
    let user_prompt = promptPack.user_prompt ?? promptPack.userPrompt ?? ''
    // Ensure prompt_version travels with the user prompt
    user_prompt = `${user_prompt}\n\nPROMPT_VERSION: ${promptVersion}`

    const maxTokens = promptPack.task === 'analyze_laws'
      || promptVersion === 'law-draft-v1'
      || promptPack.task === 'analyze_arguments'
      || promptVersion === 'argument-draft-v1'
      ? 4000
      : 1200
    const payload = {
      model: this.model,
      messages: [
        { role: 'system', content: system_prompt },
        { role: 'user', content: user_prompt },
      ],
      temperature: 0.2,
      max_completion_tokens: maxTokens,
      thinking: { type: 'disabled' },
    }

    const url = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    }

    // perform fetch; environment may not have global fetch in tests, so use node's fetch if available
    let fetcher: any
    try {
      fetcher = (globalThis as any).fetch ?? (await import('node-fetch')).default
    } catch (_e) {
      fetcher = (globalThis as any).fetch
    }

    const timeoutMs = Number(process.env.AI_PROVIDER_TIMEOUT_MS || 45000)
    const maxAttempts = 3
    let attempt = 0
    let lastError: any = null

    const start = Date.now()
    while (attempt < maxAttempts) {
      attempt++
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
      const signal = controller ? (controller as any).signal : undefined
      if (controller) setTimeout(() => controller.abort(), timeoutMs)

      try {
        const resp = await fetcher(url, { method: 'POST', headers, body: JSON.stringify(payload), signal })
        const status = resp.status
        const json = await resp.json()

        // If non-ok and retryable status, retry
        const retryableStatuses = [429, 502, 503, 504]
        if (!resp.ok && retryableStatuses.includes(status)) {
          if (attempt >= maxAttempts) {
            // continue to return error below
          } else {
            await new Promise(r => setTimeout(r, 500 * attempt))
            continue
          }
        }
        if (!resp.ok) throw new Error(`http_${status}`)

        // gather usage tokens if present
        const usage = json && json.usage ? json.usage : (json && json.data && json.data.usage ? json.data.usage : null)
        const cost = json && typeof json.cost === 'number' ? json.cost : (json && json.billing && typeof json.billing.cost === 'number' ? json.billing.cost : null)
        const duration = Date.now() - start

        // log request
        try {
          const { logAIRequest } = await import('../services/ai/aiRuntimeLogger')
          const contextSizes = (promptPack && promptPack.context_pack) ? {
            materials: Array.isArray(promptPack.context_pack.materials) ? promptPack.context_pack.materials.length : 0,
            evidence: Array.isArray(promptPack.context_pack.evidence) ? promptPack.context_pack.evidence.length : 0,
            facts: Array.isArray(promptPack.context_pack.facts) ? promptPack.context_pack.facts.length : 0,
            issues: Array.isArray(promptPack.context_pack.issues) ? promptPack.context_pack.issues.length : 0,
            laws: Array.isArray(promptPack.context_pack.laws) ? promptPack.context_pack.laws.length : 0,
            arguments: Array.isArray(promptPack.context_pack.arguments) ? promptPack.context_pack.arguments.length : 0,
            documents: Array.isArray(promptPack.context_pack.documents) ? promptPack.context_pack.documents.length : 0,
          } : {}
          logAIRequest({ provider: 'minimax', model: this.model, matter_id: promptPack.matter_id, workspace: promptPack.task, duration_ms: duration, prompt_tokens: usage && typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : null, completion_tokens: usage && typeof usage.completion_tokens === 'number' ? usage.completion_tokens : (usage && typeof usage.total_tokens === 'number' ? usage.total_tokens : null), retry: Math.max(0, attempt - 1), cost, fallback: false, prompt_version: promptVersion, context_sizes: contextSizes })
        } catch (_e) {
          // ignore logger errors
        }

        return {
          provider: 'minimax',
          model: this.model,
          response: json,
          usage,
          cost,
          duration_ms: duration,
          attempts: attempt,
          fallback: false,
          fallback_used: false,
          prompt_version: promptVersion,
          ai_audit: createAIAudit('minimax', this.model, promptVersion),
          error: undefined as string | undefined,
        }
      } catch (err: any) {
        lastError = err
        // Determine if retryable
        const isAbort = err && err.name === 'AbortError'
        const status = err && err.status
        const retryableStatuses = [429, 502, 503, 504]
        if (isAbort) {
          // timeout -> consider as retryable until attempts exhausted
          if (attempt >= maxAttempts) break
          await new Promise(r => setTimeout(r, 500 * attempt))
          continue
        }

        // If fetch returned non-OK, try to inspect status
        if (err && err.response && err.response.status && retryableStatuses.includes(err.response.status)) {
          if (attempt >= maxAttempts) break
          await new Promise(r => setTimeout(r, 500 * attempt))
          continue
        }

        // Non-retryable
        break
      }
    }

    try {
      const { logAIRequest } = await import('../services/ai/aiRuntimeLogger')
      logAIRequest({ provider: 'minimax', model: this.model, matter_id: promptPack && promptPack.matter_id, workspace: promptPack && promptPack.task, duration_ms: Date.now() - start, prompt_tokens: null, completion_tokens: null, retry: Math.max(0, attempt - 1), cost: null, fallback: false, prompt_version: promptVersion })
    } catch (_e) {
      // ignore
    }

    const reason = lastError instanceof Error ? lastError.message : String(lastError || 'unknown_error')
    throw new Error(`ai_provider_request_failed:minimax:${reason}`)
  }
}

export default MiniMaxAdapter
