import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

import { ErrorState } from '@/components/feedback/ErrorState'
import { Button } from '@/components/ui/button'
import { NotFoundPage } from './NotFoundPage'

// Never render raw error details; they may contain internal information.
export function RouteErrorPage() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />
  }

  return (
    <div className="mx-auto max-w-lg p-4 py-12">
      <ErrorState
        title="화면을 표시하지 못했습니다"
        onRetry={() => window.location.reload()}
        action={
          <Button asChild variant="ghost">
            <Link to="/">대시보드로 이동</Link>
          </Button>
        }
      />
    </div>
  )
}
