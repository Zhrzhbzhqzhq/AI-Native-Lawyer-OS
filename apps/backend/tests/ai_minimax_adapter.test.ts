import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { MiniMaxAdapter } from '../src/ai/minimaxAdapter'

describe('MiniMaxAdapter region & baseUrl selection', () => {
  const orig = { ...process.env }

  afterAll(() => {
    process.env = { ...orig }
  })

  it('uses China base URL when MINIMAX_REGION=cn', () => {
    process.env.MINIMAX_BASE_URL = ''
    process.env.MINIMAX_REGION = 'cn'
    const a = new MiniMaxAdapter()
    expect(a.baseUrl).toBe('https://api.minimaxi.com/v1')
  })

  it('uses global base URL when MINIMAX_REGION=global', () => {
    process.env.MINIMAX_BASE_URL = ''
    process.env.MINIMAX_REGION = 'global'
    const a = new MiniMaxAdapter()
    expect(a.baseUrl).toBe('https://api.minimax.io/v1')
  })

  it('MINIMAX_BASE_URL override has highest precedence', () => {
    process.env.MINIMAX_BASE_URL = 'https://example.test/v1'
    process.env.MINIMAX_REGION = 'cn'
    const a = new MiniMaxAdapter()
    expect(a.baseUrl).toBe('https://example.test/v1')
  })

  it('fallback to mock when no MINIMAX_API_KEY', async () => {
    process.env.MINIMAX_BASE_URL = ''
    process.env.MINIMAX_REGION = 'global'
    process.env.MINIMAX_API_KEY = ''
    const a = new MiniMaxAdapter()
    const out = await a.generate({})
    expect(out.provider).toBe('mock')
    expect(out.notes).toMatch(/MINIMAX_API_KEY missing/i)
  })

  it('payload shape remains consistent when key present but fetch is stubbed', async () => {
    process.env.MINIMAX_API_KEY = 'fake-key'
    process.env.MINIMAX_BASE_URL = 'http://127.0.0.1:8421'
    const a = new MiniMaxAdapter()

    // stub global fetch to return a predictable shape
    ;(globalThis as any).fetch = async (_url: string, _opts: any) => {
      return {
        json: async () => ({ summary: 'ok' }),
      }
    }

    const out = await a.generate({ system_prompt: 's', user_prompt: 'u' })
    expect(out.provider).toBe('minimax')
    expect(out.model).toBe(a.model)
    expect(out).toHaveProperty('response')
    expect(out.payload_sent).toHaveProperty('messages')
  })
})
