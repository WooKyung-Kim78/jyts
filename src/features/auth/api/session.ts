import { apiRequest, ApiError } from '@/lib/api/client'
import { profileRowSchema } from '../schemas'
import type { Profile } from '../types'

export const authQueryKey = ['auth', 'user'] as const

export async function fetchCurrentUser(): Promise<Profile | null> {
  try {
    const result = await apiRequest<unknown>('/api/user')
    const profile = profileRowSchema.safeParse(result)
    if (!profile.success) throw new ApiError(500)
    return profile.data
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export async function signInRequest(username: string, password: string): Promise<void> {
  await apiRequest('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) })
}

export async function signOutRequest(): Promise<void> {
  await apiRequest('/api/logout', { method: 'POST' })
}

export async function changePasswordRequest(input: { current_password: string; password: string; password_confirmation: string }): Promise<void> {
  await apiRequest('/api/user/password', { method: 'PUT', body: JSON.stringify(input) })
}