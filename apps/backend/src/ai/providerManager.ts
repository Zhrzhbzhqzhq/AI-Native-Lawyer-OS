import MockLlmAdapter from './mockLlmAdapter'
import MiniMaxAdapter from './minimaxAdapter'
import MiniMaxAnthropicAdapter from './minimaxAnthropicAdapter'
import type LlmAdapter from './llmAdapter'

export class ProviderManager {
  static getAdapter(): LlmAdapter {
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
