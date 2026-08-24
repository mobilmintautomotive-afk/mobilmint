'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/constants'
import { navUntukRole, type NavGroup } from './nav-items'
import { Logo } from './logo'
import { Tooltip } from '@/components/ui/primitives'

/**
 * Sidebar 248px. Di bawah 1024px jadi ikon saja,
 * di bawah 768px jadi drawer (PRD 04 bagian 1.3 & 4).
 */
export function Sidebar({
  role,
  mobileOpen,
  onMobileClose,
}: {
  role: UserRole
  mobileOpen: boolean
  onMobileClose: () => void
}) {
  const pathname = usePathname()
  const groups = navUntukRole(role)

  return (
    <>
      {/* Overlay drawer mobile */}
      <div
        onClick={onMobileClose}
        className={cn(
          'fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] transition-opacity md:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-line bg-surface transition-transform duration-200',
          'md:sticky md:top-0 md:h-screen md:translate-x-0',
          'md:w-[72px] lg:w-[248px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-4 lg:px-5">
          <Link href={role === 'investor' ? '/investor' : '/dashboard'} className="flex items-center gap-2">
            <span className="md:hidden lg:inline">
              <Logo />
            </span>
            <span className="hidden md:inline lg:hidden">
              <Logo compact />
            </span>
          </Link>
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded-sm p-1 text-ink-subtle hover:bg-neutral-soft hover:text-ink md:hidden"
            aria-label="Tutup menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="mm-scroll flex-1 overflow-y-auto px-3 pb-6">
          {groups.map((group) => (
            <NavGroupBlock
              key={group.label}
              group={group}
              pathname={pathname}
              onNavigate={onMobileClose}
            />
          ))}
        </nav>

        <div className="hidden shrink-0 border-t border-line px-5 py-3 lg:block">
          <p className="text-[11px] leading-relaxed text-ink-subtle">MobilMint</p>
        </div>
      </aside>
    </>
  )
}

function NavGroupBlock({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup
  pathname: string
  onNavigate: () => void
}) {
  return (
    <div className="mb-5">
      <p className="mb-1.5 px-3 text-caps uppercase text-ink-subtle md:hidden lg:block">
        {group.label}
      </p>
      <div className="space-y-0.5">
        {group.items.map((item) => {
          const active = item.matchPrefix
            ? pathname === item.href || pathname.startsWith(`${item.href}/`)
            : pathname === item.href
          const Icon = item.icon

          const link = (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-body transition-colors md:justify-center lg:justify-start',
                active
                  ? 'bg-accent-soft font-medium text-accent'
                  : 'text-ink-muted hover:bg-neutral-soft hover:text-ink',
              )}
            >
              {active ? (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
              ) : null}
              <Icon className="size-[18px] shrink-0" />
              <span className="truncate md:hidden lg:inline">{item.label}</span>
            </Link>
          )

          return (
            <React.Fragment key={item.href}>
              <span className="hidden md:block lg:hidden">
                <Tooltip content={item.label} side="right">
                  {link}
                </Tooltip>
              </span>
              <span className="block md:hidden lg:block">{link}</span>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
