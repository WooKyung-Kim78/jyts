import {
  Building2,
  ClipboardCheck,
  ClipboardList,
  ClipboardPen,
  LayoutDashboard,
  Server,
  Settings,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from 'lucide-react'

import type { AppRole } from '@/features/auth/types'

export type NavigationLink = {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
  // Sub-paths owned by another menu item, e.g. /equipment/master.
  excludes?: readonly string[]
  // Hides the menu for other roles; the Laravel API enforces access.
  roles?: readonly AppRole[]
}

export type NavigationGroup = {
  label: string
  icon: LucideIcon
  children: NavigationLink[]
}

export type NavigationItem = NavigationLink | NavigationGroup

export function isNavigationGroup(item: NavigationItem): item is NavigationGroup {
  return 'children' in item
}

// Routes kept for features that are not built yet; they are not shown in the menu.
export const comingSoonRoutes: NavigationLink[] = [
  { label: 'A/S', to: '/service-requests', icon: Settings },
]

export const navigationItems: NavigationItem[] = [
  { label: '대시보드', to: '/', icon: LayoutDashboard, end: true },
  { label: '정기점검 입력', to: '/inspections/new', icon: ClipboardPen },
  { label: '정기점검 리스트', to: '/inspections', icon: ClipboardCheck, end: true },
  { label: '고객사', to: '/organizations', icon: Building2 },
  { label: '장비', to: '/equipment', icon: Server, excludes: ['/equipment/master'] },
  {
    label: '관리',
    icon: Settings,
    children: [
      { label: '직원 관리', to: '/employees', icon: Users, roles: ['ADMIN'] },
      { label: '장비 마스터', to: '/equipment/master', icon: SlidersHorizontal, roles: ['ADMIN'] },
      { label: '점검일지 마스터', to: '/inspections/master', icon: ClipboardList, roles: ['ADMIN'] },
    ],
  },
]
