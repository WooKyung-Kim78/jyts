import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { UserX } from 'lucide-react'

import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Button } from '@/components/ui/button'
import { useAuth } from '../hooks/useAuth'
import { buildLoginPath } from '../redirect'

type RequireAuthProps = {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const auth = useAuth()
  const location = useLocation()

  switch (auth.status) {
    case 'loading':
      return <LoadingState fullScreen message="로그인 정보를 확인하는 중입니다…" />
    case 'signed-out':
      return <Navigate to={buildLoginPath(location.pathname + location.search)} replace />
    case 'error':
      return (
        <CenteredPanel>
          <ErrorState
            title="사용자 정보를 불러오지 못했습니다"
            onRetry={auth.retry}
            action={<SignOutButton onSignOut={auth.signOut} />}
          />
        </CenteredPanel>
      )
    case 'inactive':
      return (
        <CenteredPanel>
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-xl border bg-background p-6 text-center"
          >
            <UserX className="size-8 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-lg font-semibold">계정이 비활성 상태입니다</h1>
            <p className="text-sm text-muted-foreground">
              관리자에게 계정 활성화를 요청하세요. 활성화된 후 다시 로그인하면 이용할 수 있습니다.
            </p>
            <SignOutButton onSignOut={auth.signOut} />
          </div>
        </CenteredPanel>
      )
    case 'active':
      return children
  }
}

function CenteredPanel({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">{children}</div>
    </main>
  )
}

function SignOutButton({ onSignOut }: { onSignOut: () => Promise<void> }) {
  return (
    <Button variant="outline" onClick={() => void onSignOut()}>
      로그아웃
    </Button>
  )
}
