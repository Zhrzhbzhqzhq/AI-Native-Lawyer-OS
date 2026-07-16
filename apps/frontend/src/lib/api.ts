const DEVELOPMENT_API_BASE_URL = 'http://localhost:4000'

export function getApiBaseUrl(): string {
  const configured = String(process.env.NEXT_PUBLIC_API_BASE_URL || '').trim()
  if (configured) return configured.replace(/\/+$/, '')
  if (process.env.NODE_ENV !== 'production') return DEVELOPMENT_API_BASE_URL
  throw new Error('frontend_api_base_url_not_configured')
}

export function apiUrl(path = ''): string {
  const normalizedPath = path ? `/${String(path).replace(/^\/+/, '')}` : ''
  return `${getApiBaseUrl()}${normalizedPath}`
}
