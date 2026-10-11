import { useId, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { ChevronDown } from 'lucide-react'

import { useAuth } from '@/features/auth/hooks/useAuth'
import type { AppRole } from '@/features/auth/types'
import { cn } from '@/lib/utils'
import { isNavigationGroup, navigationItems, type NavigationGroup, type NavigationLink } from './navigation'

type Tone = 'light' | 'dark'

type SidebarNavProps = {
  onNavigate?: () => void
  tone?: Tone
}

const itemClassName = 'flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none md:min-h-9'

function toneClassName(tone: Tone, active: boolean) {
  if (tone === 'dark') return active ? 'bg-primary text-white hover:bg-primary' : 'text-navy-foreground/75 hover:bg-white/10 hover:text-white'
  return active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
}

function canSee(link: NavigationLink, role: AppRole | null) {
  return !link.roles || (role !== null && link.roles.includes(role))
}

export function SidebarNav({ onNavigate, tone = 'light' }: SidebarNavProps) {
  const auth = useAuth()
  const role = auth.status === 'active' ? auth.profile.role : null

  return (
    <ul className="flex flex-col gap-1">
      {navigationItems.map((item) => {
        if (!isNavigationGroup(item)) {
          return canSee(item, role) ? <li key={item.to}><SidebarLink link={item} tone={tone} onNavigate={onNavigate} /></li> : null
        }
        const children = item.children.filter((child) => canSee(child, role))
        return children.length ? <SidebarGroup key={item.label} group={{ ...item, children }} tone={tone} onNavigate={onNavigate} /> : null
      })}
    </ul>
  )
}

function SidebarLink({ link, tone, onNavigate, nested = false }: { link: NavigationLink; tone: Tone; onNavigate?: () => void; nested?: boolean }) {
  const { pathname } = useLocation()
  const excluded = link.excludes?.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ?? false
  const Icon = link.icon

  return (
    <NavLink
      to={link.to}
      end={link.end}
      onClick={onNavigate}
      className={({ isActive }) => cn(itemClassName, nested && 'pl-9', toneClassName(tone, isActive && !excluded))}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span>{link.label}</span>
    </NavLink>
  )
}

function SidebarGroup({ group, tone, onNavigate }: { group: NavigationGroup; tone: Tone; onNavigate?: () => void }) {
  const { pathname } = useLocation()
  const hasActiveChild = group.children.some((child) => pathname === child.to || pathname.startsWith(`${child.to}/`))
  const [toggled, setToggled] = useState<boolean | null>(null)
  const open = toggled ?? hasActiveChild
  const Icon = group.icon
  const listId = useId()

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setToggled(!open)}
        className={cn(itemClassName, toneClassName(tone, false), hasActiveChild && (tone === 'dark' ? 'text-white' : 'text-accent-foreground'))}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <ul id={listId} className="mt-1 flex flex-col gap-1">
          {group.children.map((child) => <li key={child.to}><SidebarLink link={child} tone={tone} onNavigate={onNavigate} nested /></li>)}
        </ul>
      )}
    </li>
  )
}
