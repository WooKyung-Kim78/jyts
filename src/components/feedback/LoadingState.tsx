import { LoaderCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

type LoadingStateProps = {
  message?: string
  fullScreen?: boolean
}

export function LoadingState({ message = '불러오는 중입니다…', fullScreen = false }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground',
        fullScreen && 'min-h-dvh',
      )}
    >
      <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
