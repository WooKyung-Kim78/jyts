import * as React from 'react'
import { Search } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Input } from './input'

function SearchInput({ className, containerClassName, ...props }: React.ComponentProps<'input'> & { containerClassName?: string }) {
  return (
    <div className={cn('relative', containerClassName)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input type="search" className={cn('bg-background pl-9', className)} {...props} />
    </div>
  )
}

export { SearchInput }
