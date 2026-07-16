import MockLlmAdapter from './mockLlmAdapter'
import MiniMaxAdapter from './minimaxAdapter'
import MiniMaxAnthropicAdapter from './minimaxAnthropicAdapter'
import type LlmAdapter from './llmAdapter'

export class ProviderManager {
  static getEnvironment(): string {
    return (process.env.NODE_ENV || 'development').toLowerCase()
  }

  static getConfiguredProvider(): string {
    const configured = String(process.env.AI_PROVIDER || '').trim().toLowerCase()
    if (configured) return configured
    return this.getEnvironment() === 'test' ? 'mock' : 'minimax'
  }

  static isMockEnabled(): boolean {
    const environment = this.getEnvironment()
    return this.getConfiguredProvider() === 'mock' && environment !== 'production'
  }

  static getAdapter(): LlmAdapter {
    // Allow unified AI_* environment variables to drive provider configuration.
    // Map generic AI_* keys to provider-specific MINIMAX_* keys when present so
    // existing adapters that read MINIMAX_* continue to work without change.
    if (process.env.AI_API_KEY && !process.env.MINIMAX_API_KEY) process.env.MINIMAX_API_KEY = process.env.AI_API_KEY
    if (process.env.AI_BASE_URL && !process.env.MINIMAX_BASE_URL) process.env.MINIMAX_BASE_URL = process.env.AI_BASE_URL
    if (process.env.AI_MODEL && !process.env.MINIMAX_MODEL) process.env.MINIMAX_MODEL = process.env.AI_MODEL

    const environment = this.getEnvironment()
    const provider = this.getConfiguredProvider()

    if (provider === 'mock') {
      if (environment === 'production') {
        throw new Error('ai_provider_mock_forbidden_in_production')
      }
      if (environment !== 'test' && process.env.AI_PROVIDER?.toLowerCase() !== 'mock') {
        throw new Error('ai_provider_not_configured')
      }
      return new MockLlmAdapter()
    }

    if (provider === 'minimax') {
      const authMode = (process.env.MINIMAX_AUTH_MODE || 'api_key').toLowerCase()
      if (!process.env.MINIMAX_API_KEY) {
        throw new Error('ai_provider_key_missing:minimax')
      }
      // select adapter based on auth mode
      if (authMode === 'token_plan') {
        return new MiniMaxAnthropicAdapter()
      }
      return new MiniMaxAdapter()
    }

    throw new Error(`ai_provider_unsupported:${provider}`)
  }
}

export default ProviderManager
