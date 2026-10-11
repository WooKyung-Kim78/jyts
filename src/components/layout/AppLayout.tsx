import { Suspense } from 'react'
import { Link, Outlet } from 'react-router'

import { LoadingState } from '@/components/feedback/LoadingState'
import { PageLoadingOverlay } from '@/components/feedback/PageLoadingOverlay'
import { UserMenu } from '@/features/auth/components/UserMenu'
import { MobileNav } from './MobileNav'
import { SidebarNav } from './SidebarNav'

const APP_NAME = 'JYTS 장비 이력 관리'

export function AppLayout() {
  return (
    <div className="flex min-h-dvh bg-surface">
      <PageLoadingOverlay />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:shadow"
      >
        본문으로 건너뛰기
      </a>

      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-navy text-navy-foreground md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
          <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">JY</span>
          <Link to="/" className="truncate text-sm font-semibold text-white">
            {APP_NAME}
          </Link>
        </div>
        <nav aria-label="주 메뉴" className="flex-1 overflow-y-auto p-3">
          <SidebarNav tone="dark" />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-shell-header sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/95 px-2 backdrop-blur md:px-6">
          <MobileNav />
          <Link to="/" className="truncate font-semibold md:hidden">
            {APP_NAME}
          </Link>
          <div className="ml-auto min-w-0">
            <UserMenu />
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 p-4 md:px-8 md:py-6">
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
