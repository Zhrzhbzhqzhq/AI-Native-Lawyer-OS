import { describe, it, afterAll, expect } from 'vitest'
import MiniMaxAnthropicAdapter from '../src/ai/minimaxAnthropicAdapter'

describe('MiniMaxAnthropicAdapter basic behavior', () => {
  const orig = { ...process.env }
  afterAll(() => { process.env = { ...orig } })

  it('selects CN anthropic base URL with token_plan', () => {
    process.env.MINIMAX_AUTH_MODE = 'token_plan'
    process.env.MINIMAX_TOKEN_BASE_URL = ''
    process.env.MINIMAX_REGION = 'cn'
    const a = new MiniMaxAnthropicAdapter()
    expect(a.baseUrl).toBe('https://api.minimaxi.com')
  })

  it('fallback to mock when no key', async () => {
    process.env.MINIMAX_API_KEY = ''
    process.env.MINIMAX_AUTH_MODE = 'token_plan'
    const a = new MiniMaxAnthropicAdapter()
    const out = await a.generate({})
    expect(out.provider).toBe('mock')
  })

  it('payload shape with stubbed fetch', async () => {
    process.env.MINIMAX_API_KEY = 'fake'
    process.env.MINIMAX_AUTH_MODE = 'token_plan'
    process.env.MINIMAX_TOKEN_BASE_URL = 'http://127.0.0.1:8421'
    const a = new MiniMaxAnthropicAdapter()
    ;(globalThis as any).fetch = async (_url: string, _opts: any) => ({ json: async () => ({ completion: 'ok' }) })
    const out = await a.generate({ system_prompt: 's', user_prompt: 'u' })
    expect(out.provider).toBe('minimax')
    expect(out.endpoint).toContain('http://127.0.0.1:8421/anthropic/v1/messages')
    expect(out.payload_sent).toHaveProperty('messages')
  })
})
