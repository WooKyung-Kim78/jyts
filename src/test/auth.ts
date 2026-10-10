import { vi } from 'vitest'

import type { AuthContextValue, AuthState } from '@/features/auth/hooks/useAuth'
import type { AppRole } from '@/features/auth/types'

export function createAuthValue(state: AuthState): AuthContextValue {
  return {
    ...state,
    signIn: vi.fn(async () => ({ ok: true as const })),
    signOut: vi.fn(async () => {}),
    retry: vi.fn(),
  }
}

export function activeAuth(role: AppRole = 'ADMIN'): AuthContextValue {
  return createAuthValue({
    status: 'active',
    email: 'user@example.test',
    profile: {
      id: '00000000-0000-4000-8000-000000000001',
      username: 'abcde',
      email: 'user@example.test',
      displayName: '테스트 사용자',
      role,
      active: true,
    },
  })
}
