import * as React from 'react'

import { cn } from '@/lib/utils'

export type TabItem<T extends string> = {
  value: T
  label: string
  count?: number
}

function Tabs<T extends string>({
  items,
  value,
  onValueChange,
  label,
  idBase,
  className,
}: {
  items: readonly TabItem<T>[]
  value: T
  onValueChange: (value: T) => void
  label: string
  idBase: string
  className?: string
}) {
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([])

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const lastIndex = items.length - 1
    const nextIndex = {
      ArrowRight: index === lastIndex ? 0 : index + 1,
      ArrowLeft: index === 0 ? lastIndex : index - 1,
      Home: 0,
      End: lastIndex,
    }[event.key]
    const nextItem = nextIndex === undefined ? undefined : items[nextIndex]
    if (nextIndex === undefined || !nextItem) return
    event.preventDefault()
    onValueChange(nextItem.value)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <div role="tablist" aria-label={label} className={cn('flex gap-1 overflow-x-auto border-b', className)}>
      {items.map((item, index) => {
        const selected = item.value === value
        return (
          <button
            key={item.value}
            ref={(element) => { tabRefs.current[index] = element }}
            type="button"
            role="tab"
            id={`${idBase}-tab-${item.value}`}
            aria-selected={selected}
            aria-controls={`${idBase}-panel-${item.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(item.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              '-mb-px inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:h-10',
              selected ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={cn('rounded-full px-1.5 text-xs tabular-nums', selected ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground')}>
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function TabPanel({ idBase, value, className, ...props }: React.ComponentProps<'div'> & { idBase: string; value: string }) {
  return (
    <div
      role="tabpanel"
      id={`${idBase}-panel-${value}`}
      aria-labelledby={`${idBase}-tab-${value}`}
      tabIndex={0}
      className={cn('outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50', className)}
      {...props}
    />
  )
}

export { TabPanel, Tabs }
