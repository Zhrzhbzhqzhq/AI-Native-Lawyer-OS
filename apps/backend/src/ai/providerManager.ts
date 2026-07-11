import MockLlmAdapter from './mockLlmAdapter'
import MiniMaxAdapter from './minimaxAdapter'
import MiniMaxAnthropicAdapter from './minimaxAnthropicAdapter'
import type LlmAdapter from './llmAdapter'

export class ProviderManager {
  static getAdapter(): LlmAdapter {
    // Allow unified AI_* environment variables to drive provider configuration.
    // Map generic AI_* keys to provider-specific MINIMAX_* keys when present so
    // existing adapters that read MINIMAX_* continue to work without change.
    if (process.env.AI_API_KEY && !process.env.MINIMAX_API_KEY) process.env.MINIMAX_API_KEY = process.env.AI_API_KEY
    if (process.env.AI_BASE_URL && !process.env.MINIMAX_BASE_URL) process.env.MINIMAX_BASE_URL = process.env.AI_BASE_URL
    if (process.env.AI_MODEL && !process.env.MINIMAX_MODEL) process.env.MINIMAX_MODEL = process.env.AI_MODEL

    const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase()
    if (provider === 'minimax') {
      const authMode = (process.env.MINIMAX_AUTH_MODE || 'api_key').toLowerCase()
      // select adapter based on auth mode
      if (authMode === 'token_plan') {
        const mm = new MiniMaxAnthropicAdapter()
        if (!process.env.MINIMAX_API_KEY) return new MockLlmAdapter()
        return mm
      }

      const mm = new MiniMaxAdapter()
      // if key missing fallback to mock
      if (!process.env.MINIMAX_API_KEY) {
        return new MockLlmAdapter()
      }
      return mm
    }
    return new MockLlmAdapter()
  }
}

export default ProviderManager
