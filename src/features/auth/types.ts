export const APP_ROLES = ['ADMIN', 'USER'] as const

export type AppRole = (typeof APP_ROLES)[number]

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: '관리자',
  USER: '사용자',
}

export type Profile = {
  id: string
  username: string
  email: string | null
  displayName: string
  role: AppRole
  active: boolean
}
