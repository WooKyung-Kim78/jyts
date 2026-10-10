import { Link } from 'react-router'
import { KeyRound, LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuth } from '../hooks/useAuth'
import { ROLE_LABELS } from '../types'

export function UserMenu() {
  const auth = useAuth()
  if (auth.status !== 'active') return null

  const name = auth.profile.displayName || auth.email || '사용자'

  return (
    <div className="flex min-w-0 items-center gap-2">
      <p className="hidden min-w-0 text-right text-sm sm:block">
        <span className="block truncate font-medium">{name}</span>
        <span className="block text-xs text-muted-foreground">{ROLE_LABELS[auth.profile.role]}</span>
      </p>
      <Button asChild variant="ghost" size="sm">
        <Link to="/account/password" aria-label="비밀번호 변경">
          <KeyRound aria-hidden="true" />
          <span className="hidden sm:inline">비밀번호 변경</span>
        </Link>
      </Button>
      <Button variant="outline" size="sm" onClick={() => void auth.signOut()}>
        <LogOut aria-hidden="true" />
        로그아웃
      </Button>
    </div>
  )
}
