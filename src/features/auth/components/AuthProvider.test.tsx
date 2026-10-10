import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/api/client'
import { useAuth, type AuthContextValue } from '../hooks/useAuth'
import { AuthProvider } from './AuthProvider'

const sessionApi = vi.hoisted(() => ({
  authQueryKey: ['auth', 'user'],
  fetchCurrentUser: vi.fn(),
  signInRequest: vi.fn(),
  signOutRequest: vi.fn(),
}))

vi.mock('../api/session', () => sessionApi)

const activeProfile = {
  id: '1',
  username: 'abcde',
  email: 'user@example.test',
  displayName: '테스트 사용자',
  role: 'USER' as const,
  active: true,
}

function renderProvider() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const result: { current: AuthContextValue | null } = { current: null }

  function Probe() {
    const auth = useAuth()
    result.current = auth
    return <p data-testid="status">{auth.status}</p>
  }

  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  )

  return { result, queryClient }
}

const status = () => screen.getByTestId('status').textContent

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionApi.fetchCurrentUser.mockResolvedValue(null)
    sessionApi.signInRequest.mockResolvedValue(undefined)
    sessionApi.signOutRequest.mockResolvedValue(undefined)
  })

  it('reports signed-out when the session has no authenticated user', async () => {
    renderProvider()
    await waitFor(() => expect(status()).toBe('signed-out'))
  })

  it('reports active using the server profile', async () => {
    sessionApi.fetchCurrentUser.mockResolvedValue(activeProfile)
    const { result } = renderProvider()

    await waitFor(() => expect(status()).toBe('active'))
    expect(result.current?.status === 'active' && result.current.profile.role).toBe('USER')
  })

  it('reports inactive when the server denies the current user', async () => {
    sessionApi.fetchCurrentUser.mockRejectedValue(new ApiError(403))
    renderProvider()
    await waitFor(() => expect(status()).toBe('inactive'))
  })

  it('reports an error when the profile request fails unexpectedly', async () => {
    sessionApi.fetchCurrentUser.mockRejectedValue(new ApiError(500))
    renderProvider()
    await waitFor(() => expect(status()).toBe('error'))
  })

  it('maps authentication and unexpected sign-in errors', async () => {
    const { result } = renderProvider()
    await waitFor(() => expect(status()).toBe('signed-out'))

    sessionApi.signInRequest.mockRejectedValueOnce(new ApiError(422))
    await expect(result.current?.signIn('abcde', 'wrong')).resolves.toEqual({
      ok: false,
      error: 'invalid-credentials',
    })

    sessionApi.signInRequest.mockRejectedValueOnce(new ApiError(500))
    await expect(result.current?.signIn('abcde', 'wrong')).resolves.toEqual({
      ok: false,
      error: 'unknown',
    })
  })

  it('refreshes the server profile after sign in', async () => {
    const { result } = renderProvider()
    await waitFor(() => expect(status()).toBe('signed-out'))
    sessionApi.fetchCurrentUser.mockResolvedValue(activeProfile)

    await act(async () => {
      await result.current?.signIn('abcde', 'correct')
    })

    expect(sessionApi.signInRequest).toHaveBeenCalledWith('abcde', 'correct')
    await waitFor(() => expect(status()).toBe('active'))
  })

  it('clears cached user and business data on sign out', async () => {
    sessionApi.fetchCurrentUser.mockResolvedValue(activeProfile)
    const { result, queryClient } = renderProvider()
    await waitFor(() => expect(status()).toBe('active'))
    queryClient.setQueryData(['equipment'], ['cached'])

    await act(async () => {
      await result.current?.signOut()
    })

    expect(sessionApi.signOutRequest).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(['equipment'])).toBeUndefined()
    expect(queryClient.getQueryData(sessionApi.authQueryKey)).toBeNull()
    await waitFor(() => expect(status()).toBe('signed-out'))
  })
})
