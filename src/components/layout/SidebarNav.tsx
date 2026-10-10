import { NavLink } from 'react-router'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils'
import { navigationItems } from './navigation'

type SidebarNavProps = {
  onNavigate?: () => void
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const auth = useAuth()
  const role = auth.status === 'active' ? auth.profile.role : null
  const visibleItems = navigationItems.filter(
    (item) => !item.roles || (role !== null && item.roles.includes(role)),
  )

  return (
    <ul className="flex flex-col gap-1">
      {visibleItems.map(({ label, to, icon: Icon, end }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none md:min-h-10',
                isActive && 'bg-accent text-accent-foreground',
              )
            }
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  )
}
