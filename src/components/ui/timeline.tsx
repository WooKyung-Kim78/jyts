import * as React from 'react'

import { cn } from '@/lib/utils'
import { toneDotClassNames, type BadgeTone } from './badge'

export type TimelineEntry = {
  id: string
  date: string | null
  title: React.ReactNode
  tone?: BadgeTone
  badge?: React.ReactNode
  meta?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

function Timeline({ items, label, className }: { items: readonly TimelineEntry[]; label: string; className?: string }) {
  return (
    <ol aria-label={label} className={cn('flex flex-col', className)}>
      {items.map((item, index) => (
        <li key={item.id} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[6rem_1.25rem_minmax(0,1fr)]">
          <time className="hidden pt-3 text-right text-sm font-medium tabular-nums sm:block" dateTime={item.date ?? undefined}>
            {item.date ?? '-'}
          </time>
          <div aria-hidden="true" className="relative flex justify-center">
            <span className={cn('relative z-10 mt-4 size-2.5 rounded-full ring-4 ring-background', toneDotClassNames[item.tone ?? 'neutral'])} />
            {index < items.length - 1 && <span className="absolute top-6 bottom-0 w-px bg-border" />}
          </div>
          <div className="mb-3 min-w-0 rounded-md border bg-background px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-sm tabular-nums text-muted-foreground sm:hidden">{item.date ?? '-'}</span>
                <span className="font-medium">{item.title}</span>
                {item.badge}
              </div>
              {item.action}
            </div>
            {item.meta && <div className="mt-1 text-xs text-muted-foreground">{item.meta}</div>}
            {item.description && <div className="mt-2 text-sm whitespace-pre-wrap">{item.description}</div>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export { Timeline }
