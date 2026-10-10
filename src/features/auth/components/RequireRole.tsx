import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ShieldX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuth } from '../hooks/useAuth'
import type { AppRole } from '../types'

type RequireRoleProps = {
  roles: readonly AppRole[]
  children: ReactNode
}

// UX guard only; Laravel Policies enforce data access on the server.
export function RequireRole({ roles, children }: RequireRoleProps) {
  const auth = useAuth()

  if (auth.status === 'active' && roles.includes(auth.profile.role)) {
    return children
  }

  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <ShieldX className="size-10 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-2xl font-bold">접근 권한이 없습니다</h1>
      <p className="text-sm text-muted-foreground">
        이 메뉴를 사용할 권한이 없습니다. 필요한 경우 관리자에게 문의하세요.
      </p>
      <Button asChild>
        <Link to="/">대시보드로 이동</Link>
      </Button>
    </div>
  )
}
