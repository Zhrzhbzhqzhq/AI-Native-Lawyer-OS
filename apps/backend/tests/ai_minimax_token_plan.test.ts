import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { MiniMaxAdapter } from '../src/ai/minimaxAdapter'

describe('MiniMaxAdapter token plan and auth mode selection', () => {
  const orig = { ...process.env }

  afterAll(() => {
    process.env = { ...orig }
  })

  it('token_plan + cn uses expected CN base URL', () => {
    process.env.MINIMAX_AUTH_MODE = 'token_plan'
    process.env.MINIMAX_TOKEN_BASE_URL = ''
    process.env.MINIMAX_REGION = 'cn'
    const a = new MiniMaxAdapter()
    expect(a.authMode).toBe('token_plan')
    expect(a.baseUrl).toBe('https://api.minimaxi.com/v1')
  })

  it('token_plan + global uses expected global base URL', () => {
    process.env.MINIMAX_AUTH_MODE = 'token_plan'
    process.env.MINIMAX_TOKEN_BASE_URL = ''
    process.env.MINIMAX_REGION = 'global'
    const a = new MiniMaxAdapter()
    expect(a.baseUrl).toBe('https://api.minimax.io/v1')
  })

  it('api_key + cn uses CN base URL', () => {
    process.env.MINIMAX_AUTH_MODE = 'api_key'
    process.env.MINIMAX_TOKEN_BASE_URL = ''
    process.env.MINIMAX_REGION = 'cn'
    const a = new MiniMaxAdapter()
    expect(a.authMode).toBe('api_key')
    expect(a.baseUrl).toBe('https://api.minimaxi.com/v1')
  })

  it('api_key + global uses global base URL', () => {
    process.env.MINIMAX_AUTH_MODE = 'api_key'
    process.env.MINIMAX_TOKEN_BASE_URL = ''
    process.env.MINIMAX_REGION = 'global'
    const a = new MiniMaxAdapter()
    expect(a.baseUrl).toBe('https://api.minimax.io/v1')
  })

  it('MINIMAX_BASE_URL override has highest precedence', () => {
    process.env.MINIMAX_BASE_URL = 'https://override.test/v1'
    process.env.MINIMAX_TOKEN_BASE_URL = 'https://token.test/v1'
    process.env.MINIMAX_AUTH_MODE = 'token_plan'
    process.env.MINIMAX_REGION = 'cn'
    const a = new MiniMaxAdapter()
    expect(a.baseUrl).toBe('https://override.test/v1')
  })

  it('fallback to mock when no MINIMAX_API_KEY', async () => {
    process.env.MINIMAX_BASE_URL = ''
    process.env.MINIMAX_AUTH_MODE = 'token_plan'
    process.env.MINIMAX_REGION = 'global'
    process.env.MINIMAX_API_KEY = ''
    const a = new MiniMaxAdapter()
    const out = await a.generate({})
    expect(out.provider).toBe('mock')
  })

  it('payload shape unchanged with stubbed fetch', async () => {
    process.env.MINIMAX_API_KEY = 'fake-key'
    process.env.MINIMAX_AUTH_MODE = 'token_plan'
    process.env.MINIMAX_TOKEN_BASE_URL = 'http://127.0.0.1:8421'
    const a = new MiniMaxAdapter()
    ;(globalThis as any).fetch = async (_url: string, _opts: any) => ({ json: async () => ({ summary: 'ok' }) })
    const out = await a.generate({ system_prompt: 's', user_prompt: 'u' })
    expect(out.provider).toBe('minimax')
    expect(out.payload_sent).toHaveProperty('messages')
  })
})
