import * as React from 'react'
import { Link } from 'react-router'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { BadgeTone } from './badge'

const toneClassNames: Record<BadgeTone | 'primary', { bar: string; value: string }> = {
  primary: { bar: 'bg-primary', value: 'text-foreground' },
  success: { bar: 'bg-emerald-500', value: 'text-emerald-700' },
  warning: { bar: 'bg-orange-500', value: 'text-orange-700' },
  danger: { bar: 'bg-red-500', value: 'text-red-700' },
  info: { bar: 'bg-blue-500', value: 'text-blue-700' },
  neutral: { bar: 'bg-slate-400', value: 'text-slate-700' },
}

function StatTile({
  label,
  value,
  hint,
  tone = 'primary',
  to,
  icon: Icon,
}: {
  label: string
  value: number | string
  hint?: React.ReactNode
  tone?: BadgeTone | 'primary'
  to?: string
  icon?: LucideIcon
}) {
  const colors = toneClassNames[tone]
  const content = (
    <>
      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', colors.bar)} />
      <span className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
        {label}
        {Icon && <Icon className="size-4" aria-hidden="true" />}
      </span>
      <span className={cn('text-3xl font-bold tracking-tight tabular-nums', colors.value)}>
        {typeof value === 'number' ? value.toLocaleString('ko-KR') : value}
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </>
  )
  const className = 'relative flex min-w-0 flex-col gap-1 overflow-hidden rounded-lg border bg-background py-4 pr-4 pl-5'

  return to ? (
    <Link to={to} className={cn(className, 'transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none')}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}

export { StatTile }
