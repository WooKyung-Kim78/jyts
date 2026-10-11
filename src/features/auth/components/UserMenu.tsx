import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown, KeyRound, LogOut, UserRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '../hooks/useAuth'
import { ROLE_LABELS } from '../types'

export function UserMenu() {
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const closeOnOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  if (auth.status !== 'active') return null

  const name = auth.profile.displayName || auth.email || '사용자'

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        aria-expanded={open}
        aria-controls={panelId}
        className="max-w-56 gap-1.5 px-2"
        onClick={() => setOpen((current) => !current)}
      >
        <UserRound aria-hidden="true" />
        <span className="truncate font-medium">{name}</span>
        <ChevronDown className={cn('transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </Button>

      {open && (
        <div id={panelId} className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-md border bg-background py-1 shadow-lg">
          <div className="border-b px-3 py-2">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">권한: {ROLE_LABELS[auth.profile.role]}</p>
          </div>
          <Link
            to="/account/password"
            onClick={() => setOpen(false)}
            className="flex min-h-10 items-center gap-2 px-3 text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
          >
            <KeyRound className="size-4" aria-hidden="true" />비밀번호 변경
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              void auth.signOut()
            }}
            className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-sm text-destructive hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
          >
            <LogOut className="size-4" aria-hidden="true" />로그아웃
          </button>
        </div>
      )}
    </div>
  )
}
