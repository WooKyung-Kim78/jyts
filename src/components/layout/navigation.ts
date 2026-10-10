import {
  Building2,
  ClipboardCheck,
  ClipboardList,
  ClipboardPen,
  LayoutDashboard,
  Server,
  Settings,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import type { AppRole } from '@/features/auth/types'

export type NavigationItem = {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
  // Hides the menu for other roles; the Laravel API enforces access.
  roles?: readonly AppRole[]
}

export const dashboardNavigationItem: NavigationItem = {
  label: '대시보드',
  to: '/',
  icon: LayoutDashboard,
  end: true,
}

// Menus whose features are not implemented yet; they render a "준비 중" page.
export const upcomingNavigationItems: NavigationItem[] = [
  { label: '고객사', to: '/organizations', icon: Building2 },
  { label: 'A/S', to: '/service-requests', icon: Wrench },
  { label: '관리', to: '/admin', icon: Settings, roles: ['ADMIN'] },
]

export const equipmentNavigationItem: NavigationItem = {
  label: '장비',
  to: '/equipment',
  icon: Server,
}

export const equipmentMasterNavigationItem: NavigationItem = {
  label: '장비 마스터',
  to: '/equipment/master',
  icon: Settings,
  roles: ['ADMIN'],
}

export const inspectionEntryNavigationItem: NavigationItem = {
  label: '정기점검 입력',
  to: '/inspections/new',
  icon: ClipboardPen,
}

export const inspectionsNavigationItem: NavigationItem = {
  label: '정기점검',
  to: '/inspections',
  icon: ClipboardCheck,
  end: true,
}

export const inspectionTemplateNavigationItem: NavigationItem = {
  label: '점검일지 마스터',
  to: '/inspections/master',
  icon: ClipboardList,
  roles: ['ADMIN'],
}

export const employeesNavigationItem: NavigationItem = {
  label: '직원 관리',
  to: '/employees',
  icon: Users,
  roles: ['ADMIN'],
}

export const navigationItems: NavigationItem[] = [
  dashboardNavigationItem,
  ...upcomingNavigationItems.slice(0, 1),
  equipmentNavigationItem,
  equipmentMasterNavigationItem,
  inspectionEntryNavigationItem,
  inspectionsNavigationItem,
  inspectionTemplateNavigationItem,
  employeesNavigationItem,
  ...upcomingNavigationItems.slice(1),
]
