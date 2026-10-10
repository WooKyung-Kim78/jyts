import { useCallback, useMemo, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError } from '@/lib/api/client'
import { authQueryKey, fetchCurrentUser, signInRequest, signOutRequest } from '../api/session'
import { AuthContext, type AuthContextValue, type AuthState, type SignInResult } from '../hooks/useAuth'

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient()

  const profileQuery = useQuery({
    queryKey: authQueryKey,
    queryFn: fetchCurrentUser,
    retry: false,
    refetchOnWindowFocus: true,
  })

  const state = useMemo((): AuthState => {
    if (profileQuery.isPending) return { status: 'loading' }
    if (profileQuery.isError) {
      return profileQuery.error instanceof ApiError && profileQuery.error.status === 403
        ? { status: 'inactive', email: null }
        : { status: 'error', email: null }
    }

    const profile = profileQuery.data
    if (!profile) return { status: 'signed-out' }
    if (!profile.active) return { status: 'inactive', email: profile.email }
    return { status: 'active', email: profile.email, profile }
  }, [profileQuery.isPending, profileQuery.isError, profileQuery.error, profileQuery.data])

  const signIn = useCallback(
    async (username: string, password: string): Promise<SignInResult> => {
      try {
        await signInRequest(username, password)
        await queryClient.invalidateQueries({ queryKey: authQueryKey })
        return { ok: true }
      } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
          return { ok: false, error: 'invalid-credentials' }
        }
        return { ok: false, error: 'unknown' }
      }
    },
    [queryClient],
  )

  const signOut = useCallback(async () => {
    try {
      await signOutRequest()
    } finally {
      await queryClient.cancelQueries()
      queryClient.setQueryData(authQueryKey, null)
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== authQueryKey[0] })
    }
  }, [queryClient])

  const { refetch } = profileQuery
  const retry = useCallback(() => {
    void refetch()
  }, [refetch])

  const value = useMemo((): AuthContextValue => ({ ...state, signIn, signOut, retry }), [state, signIn, signOut, retry])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
