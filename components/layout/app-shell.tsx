'use client'

import * as React from 'react'
import { Menu } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/primitives'
import type { UserRole } from '@/lib/constants'
import { Sidebar } from './sidebar'
import { Logo } from './logo'
import { RoleSwitcher, type InvestorOption } from './role-switcher'

export function AppShell({
  role,
  investorId,
  investors,
  children,
}: {
  role: UserRole
  investorId: string | null
  investors: InvestorOption[]
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-page">
        <Sidebar role={role} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="mm-navbar sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-[10px] p-2 text-ink-muted transition-colors hover:bg-neutral-soft hover:text-ink md:hidden"
              aria-label="Buka menu"
            >
              <Menu className="size-5" />
            </button>

            <span className="md:hidden">
              <Logo size="sm" />
            </span>

            <div className="ml-auto flex items-center gap-2">
              {/* FASE 5: hapus baris di bawah ini, ganti dengan menu akun */}
              <RoleSwitcher role={role} investorId={investorId} investors={investors} />
            </div>
          </header>

          <main className="mx-auto w-full max-w-app flex-1 px-4 py-5 sm:px-6 sm:py-6">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
