import * as React from 'react'

import { cn } from '@/lib/utils'

export type DescriptionItem = {
  label: string
  value: React.ReactNode
  key?: string
  wide?: boolean
}

const columnClassNames = {
  1: '',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 xl:grid-cols-3',
} as const

function DescriptionList({ items, columns = 2, className }: { items: readonly DescriptionItem[]; columns?: 1 | 2 | 3; className?: string }) {
  return (
    <dl className={cn('-mb-px grid grid-cols-1', columnClassNames[columns], className)}>
      {items.map((item) => (
        <div key={item.key ?? item.label} className={cn('grid min-h-10 grid-cols-[8.5rem_minmax(0,1fr)] border-b text-sm', item.wide && 'sm:col-span-full')}>
          <dt className="flex items-center bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">{item.label}</dt>
          <dd className="flex items-center px-3 py-2 break-words">{isEmpty(item.value) ? '-' : item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function isEmpty(value: React.ReactNode): boolean {
  return value === null || value === undefined || value === ''
}

export { DescriptionList }
