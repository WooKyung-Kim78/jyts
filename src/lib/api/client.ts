import { z } from 'zod'

const apiEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
})

export class ApiError extends Error {
  readonly status: number

  constructor(status: number) {
    super('API 요청에 실패했습니다.')
    this.name = 'ApiError'
    this.status = status
  }
}

function readXsrfToken(): string | null {
  const value = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)?.[1]
  return value ? decodeURIComponent(value) : null
}

async function ensureCsrfCookie(): Promise<string> {
  let token = readXsrfToken()
  if (token) return token

  const response = await fetch('/sanctum/csrf-cookie', {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok || !(token = readXsrfToken())) throw new ApiError(response.status || 419)
  return token
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (init.body !== undefined && !(typeof FormData !== 'undefined' && init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    headers.set('X-XSRF-TOKEN', await ensureCsrfCookie())
  }

  const response = await fetch(path, { ...init, method, headers, credentials: 'include' })
  if (response.status === 204) return undefined as T
  if (!response.ok) throw new ApiError(response.status)

  const body: unknown = await response.json().catch(() => null)

  const envelope = apiEnvelopeSchema.safeParse(body)
  if (!envelope.success || !envelope.data.success || !('data' in envelope.data)) {
    throw new ApiError(500)
  }

  return envelope.data.data as T
}