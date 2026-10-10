import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiRequest } from './client'

describe('apiRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/'
  })

  it('sends the decoded CSRF token and session credentials on state changes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { authenticated: false } }),
    } as Response)
    document.cookie = 'XSRF-TOKEN=csrf%2Btoken; path=/'

    await expect(apiRequest('/api/logout', { method: 'POST' })).resolves.toEqual({ authenticated: false })

    expect(fetchMock).toHaveBeenCalledWith('/api/logout', expect.objectContaining({ credentials: 'include' }))
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.get('X-XSRF-TOKEN')).toBe('csrf+token')
  })

  it('throws a status-only error for failed API responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500 } as Response)

    await expect(apiRequest('/api/user')).rejects.toMatchObject({ name: 'ApiError', status: 500 })
  })

  it('leaves multipart content type to the browser boundary encoder', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { uploaded: true } }),
    } as Response)
    document.cookie = 'XSRF-TOKEN=csrf-token; path=/'
    const body = new FormData()
    body.append('image', new File(['map'], 'map.png', { type: 'image/png' }))

    await expect(apiRequest('/api/organizations/map', { method: 'POST', body })).resolves.toEqual({ uploaded: true })

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.get('Content-Type')).toBeNull()
    expect(headers.get('X-XSRF-TOKEN')).toBe('csrf-token')
  })
})