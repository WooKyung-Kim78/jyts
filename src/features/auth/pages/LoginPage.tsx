import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useSearchParams } from 'react-router'
import { TriangleAlert } from 'lucide-react'

import { LoadingState } from '@/components/feedback/LoadingState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { useAuth, type SignInResult } from '../hooks/useAuth'
import { getSafeRedirectPath } from '../redirect'
import { loginSchema, type LoginFormValues } from '../schemas'

type SignInError = Extract<SignInResult, { ok: false }>['error']

const signInErrorMessages: Record<SignInError, string> = {
  'invalid-credentials': '아이디 또는 비밀번호가 올바르지 않습니다.',
  unknown: '로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
}

export function LoginPage() {
  const auth = useAuth()
  const [searchParams] = useSearchParams()
  const redirectPath = getSafeRedirectPath(searchParams.get('redirect'))
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  if (auth.status === 'loading') {
    return <LoadingState fullScreen message="로그인 정보를 확인하는 중입니다…" />
  }

  // Inactive or errored sessions are handled by RequireAuth on the target page.
  if (auth.status === 'active' || auth.status === 'inactive' || auth.status === 'error') {
    return <Navigate to={redirectPath} replace />
  }

  const onSubmit = handleSubmit(async ({ username, password }) => {
    setSubmitError(null)
    const result = await auth.signIn(username, password)
    if (!result.ok) setSubmitError(signInErrorMessages[result.error])
  })

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <p className="text-sm font-medium text-muted-foreground">JYTS 장비 이력 관리</p>
          <CardTitle>
            <h1 className="text-xl">로그인</h1>
          </CardTitle>
          <CardDescription>관리자가 등록한 계정으로 로그인하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form noValidate onSubmit={(event) => void onSubmit(event)}>
            <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="login-username">아이디</Label>
                <Input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  maxLength={5}
                  aria-invalid={errors.username ? true : undefined}
                  aria-describedby={errors.username ? 'login-username-error' : undefined}
                  {...register('username')}
                />
                {errors.username && (
                  <p id="login-username-error" className="text-sm text-destructive">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="login-password">비밀번호</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                  {...register('password')}
                />
                {errors.password && (
                  <p id="login-password-error" className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {submitError && (
                <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {submitError}
                </p>
              )}

              <Button type="submit" className="w-full">
                {isSubmitting ? '로그인 중…' : '로그인'}
              </Button>
            </fieldset>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
