import { createContext, useContext } from 'react'

import type { Profile } from '../types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'error'; email: string | null }
  | { status: 'inactive'; email: string | null }
  | { status: 'active'; email: string | null; profile: Profile }

export type SignInResult = { ok: true } | { ok: false; error: 'invalid-credentials' | 'unknown' }

export type AuthActions = {
  signIn: (username: string, password: string) => Promise<SignInResult>
  signOut: () => Promise<void>
  retry: () => void
}

export type AuthContextValue = AuthState & AuthActions

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
