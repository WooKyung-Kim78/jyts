import { useIsFetching } from '@tanstack/react-query'
import { LoaderCircle } from 'lucide-react'
import { useNavigation } from 'react-router'

// Only first loads (queries without cached data) and route transitions; background refetches stay silent.
export function PageLoadingOverlay() {
  const navigation = useNavigation()
  const initialFetches = useIsFetching({ predicate: (query) => query.state.data === undefined })
  if (navigation.state !== 'loading' && initialFetches === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="데이터를 불러오는 중"
      data-testid="page-loading-overlay"
      className="page-loading-overlay fixed inset-0 z-[60] flex items-center justify-center bg-background/40 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 rounded-md border bg-background px-4 py-3 text-sm shadow-lg">
        <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
        <span>데이터를 불러오는 중입니다…</span>
      </div>
    </div>
  )
}
