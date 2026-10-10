import { z } from 'zod'

import { APP_ROLES, type Profile } from './types'

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{5}$/, '아이디는 영문 5자로 입력하세요.'),
  password: z.string().min(1, '비밀번호를 입력하세요.').max(128, '비밀번호가 너무 깁니다.'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const profileRowSchema = z
  .object({
    id: z.string().min(1),
    username: z.string().regex(/^[a-z]{5}$/),
    email: z.email().nullable(),
    display_name: z.string(),
    role: z.enum(APP_ROLES),
    active: z.boolean(),
  })
  .transform(
    (row): Profile => ({
      id: row.id,
      username: row.username,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      active: row.active,
    }),
  )
