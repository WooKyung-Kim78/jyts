import * as React from 'react'

import { cn } from '@/lib/utils'

function Panel({
  title,
  description,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}) {
  const titleId = React.useId()

  return (
    <section aria-labelledby={titleId} className={cn('flex min-w-0 flex-col overflow-hidden rounded-lg border bg-background', className)}>
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="min-w-0">
          <h2 id={titleId} className="text-sm font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      <div className={cn('min-w-0 flex-1', bodyClassName)}>{children}</div>
    </section>
  )
}

export { Panel }
