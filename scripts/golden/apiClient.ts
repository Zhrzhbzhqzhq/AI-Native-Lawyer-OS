import { compact } from './utils'

declare const fetch: any

export class ApiError extends Error {
  status: number | 'ERROR'
  endpoint: string
  body: string

  constructor(endpoint: string, status: number | 'ERROR', body: string) {
    super(`${endpoint} failed: ${status} ${compact(body, 300)}`)
    this.endpoint = endpoint
    this.status = status
    this.body = body
  }
}

export class GoldenApiClient {
  constructor(public baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  async get<T = any>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  async post<T = any>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  async patch<T = any>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body)
  }

  async binary(path: string) {
    const endpoint = `${this.baseUrl}${path}`
    let res: any
    try {
      res = await fetch(endpoint)
    } catch (err: any) {
      throw new ApiError(endpoint, 'ERROR', err?.message || String(err))
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    if (!res.ok) throw new ApiError(endpoint, res.status, buffer.toString('utf8'))
    return {
      status: res.status,
      contentType: res.headers.get('content-type') || '',
      sizeBytes: buffer.length,
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const endpoint = `${this.baseUrl}${path}`
    const init: any = { method }
    if (typeof body !== 'undefined') {
      init.headers = { 'content-type': 'application/json' }
      init.body = JSON.stringify(body)
    }
    let res: any
    try {
      res = await fetch(endpoint, init)
    } catch (err: any) {
      throw new ApiError(endpoint, 'ERROR', err?.message || String(err))
    }
    const text = await res.text()
    if (!res.ok) throw new ApiError(endpoint, res.status, text)
    if (!text) return undefined as T
    try {
      return JSON.parse(text) as T
    } catch {
      return text as T
    }
  }
}
