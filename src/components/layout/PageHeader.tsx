import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function PageHeader({
  title,
  description,
  badge,
  actions,
  backTo,
  backLabel = '이전 화면으로 돌아가기',
}: {
  title: string
  description?: ReactNode
  badge?: ReactNode
  actions?: ReactNode
  backTo?: string
  backLabel?: string
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="flex min-w-0 items-start gap-2">
        {backTo && (
          <Button asChild variant="ghost" size="icon" className="-ml-2 shrink-0" aria-label={backLabel}>
            <Link to={backTo}><ArrowLeft aria-hidden="true" /></Link>
          </Button>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
            {badge}
          </div>
          {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
