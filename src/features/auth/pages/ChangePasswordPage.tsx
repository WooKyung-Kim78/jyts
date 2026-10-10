import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { ApiError } from '@/lib/api/client'
import { changePasswordRequest } from '../api/session'

const changePasswordSchema = z.object({
  current_password: z.string().min(1, '현재 비밀번호를 입력하세요.').max(128),
  password: z.string().min(8, '새 비밀번호는 8자 이상 입력하세요.').max(128, '비밀번호가 너무 깁니다.'),
  password_confirmation: z.string(),
}).refine((values) => values.password === values.password_confirmation, {
  path: ['password_confirmation'],
  message: '새 비밀번호가 일치하지 않습니다.',
}).refine((values) => values.password !== values.current_password, {
  path: ['password'],
  message: '현재 비밀번호와 다른 비밀번호를 입력하세요.',
})

type ChangePasswordValues = z.infer<typeof changePasswordSchema>

const fields = [
  { name: 'current_password', label: '현재 비밀번호', autoComplete: 'current-password' },
  { name: 'password', label: '새 비밀번호 (8자 이상)', autoComplete: 'new-password' },
  { name: 'password_confirmation', label: '새 비밀번호 확인', autoComplete: 'new-password' },
] as const

export function ChangePasswordPage() {
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: '', password: '', password_confirmation: '' },
  })
  const mutation = useMutation({
    mutationFn: changePasswordRequest,
    onSuccess: () => {
      reset()
      setNotice({ tone: 'success', text: '비밀번호를 변경했습니다. 다른 기기의 로그인은 해제됩니다.' })
    },
    onError: (error) => setNotice({
      tone: 'error',
      text: error instanceof ApiError && error.status === 422
        ? '현재 비밀번호가 올바르지 않거나 새 비밀번호를 사용할 수 없습니다.'
        : error instanceof ApiError && error.status === 429
          ? '요청이 너무 많습니다. 잠시 후 다시 시도하세요.'
          : '비밀번호를 변경하지 못했습니다. 다시 시도하세요.',
    }),
  })

  return (
    <section className="flex max-w-md flex-col gap-5">
      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold">비밀번호 변경</h1>
        <p className="mt-1 text-sm text-muted-foreground">현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다.</p>
      </header>
      <form noValidate className="flex flex-col gap-4" onSubmit={handleSubmit((values) => {
        setNotice(null)
        mutation.mutate(values)
      })}>
        <fieldset disabled={mutation.isPending} className="flex flex-col gap-4">
          {fields.map(({ name, label, autoComplete }) => (
            <div key={name} className="flex flex-col gap-2">
              <Label htmlFor={`account-${name}`}>{label}</Label>
              <Input
                id={`account-${name}`}
                type="password"
                autoComplete={autoComplete}
                maxLength={128}
                aria-invalid={errors[name] ? true : undefined}
                aria-describedby={errors[name] ? `account-${name}-error` : undefined}
                {...register(name)}
              />
              {errors[name] && <p id={`account-${name}-error`} className="text-sm text-destructive">{errors[name]?.message}</p>}
            </div>
          ))}
        </fieldset>
        {notice && (
          <p role={notice.tone === 'error' ? 'alert' : 'status'} className={notice.tone === 'error' ? 'text-sm text-destructive' : 'text-sm'}>
            {notice.text}
          </p>
        )}
        <Button type="submit" className="self-start" disabled={mutation.isPending}>
          <KeyRound aria-hidden="true" />{mutation.isPending ? '변경 중…' : '비밀번호 변경'}
        </Button>
      </form>
    </section>
  )
}
