import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        warning: 'border-orange-200 bg-orange-50 text-orange-700',
        danger: 'border-red-200 bg-red-50 text-red-700',
        info: 'border-blue-200 bg-blue-50 text-blue-700',
        neutral: 'border-slate-200 bg-slate-100 text-slate-600',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>

export const toneDotClassNames: Record<BadgeTone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-orange-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-slate-400',
}

function Badge({
  className,
  tone,
  dot = false,
  children,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ tone, className }))} {...props}>
      {dot && <span aria-hidden="true" className={cn('size-1.5 rounded-full', toneDotClassNames[tone ?? 'neutral'])} />}
      {children}
    </span>
  )
}

export { Badge }
