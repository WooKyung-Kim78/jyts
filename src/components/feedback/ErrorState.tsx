import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'

type ErrorStateProps = {
  title?: string
  message?: string
  onRetry?: () => void
  action?: ReactNode
}

export function ErrorState({
  title = '문제가 발생했습니다',
  message = '잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 문의하세요.',
  onRetry,
  action,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center"
    >
      <TriangleAlert className="size-8 text-destructive" aria-hidden="true" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{message}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            다시 시도
          </Button>
        )}
        {action}
      </div>
    </div>
  )
}
