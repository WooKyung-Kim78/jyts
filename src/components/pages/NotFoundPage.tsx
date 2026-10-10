import { Link } from 'react-router'
import { SearchX } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <SearchX className="size-10 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-muted-foreground">
        주소가 올바른지 확인하거나 대시보드로 이동해 주세요.
      </p>
      <Button asChild>
        <Link to="/">대시보드로 이동</Link>
      </Button>
    </div>
  )
}
