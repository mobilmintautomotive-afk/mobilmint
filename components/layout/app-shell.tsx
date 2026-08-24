'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Menu, X } from 'lucide-react'
import { toast } from 'sonner'
import { TooltipProvider } from '@/components/ui/primitives'
import type { UserRole } from '@/lib/constants'
import { clearViewAs } from '@/app/actions/view-as'
import { Sidebar } from './sidebar'
import { Logo } from './logo'
import { AccountMenu, type InvestorOption } from './account-menu'

export function AppShell({
  nama,
  email,
  role,
  isAdmin,
  viewingAsLabel,
  investors,
  children,
}: {
  nama: string
  email: string
  role: UserRole
  isAdmin: boolean
  viewingAsLabel: string | null
  investors: InvestorOption[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  function kembaliKeAdmin() {
    startTransition(async () => {
      await clearViewAs()
      toast.success('Kembali ke tampilan Admin')
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-page">
        <Sidebar role={role} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col">
          {viewingAsLabel ? (
            <div className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-1.5 text-center text-label font-medium text-warning-deep">
              <Eye className="size-3.5 shrink-0" />
              <span>
                Lihat sebagai <strong>{viewingAsLabel}</strong>
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={kembaliKeAdmin}
                className="ml-1 inline-flex items-center gap-1 rounded-full bg-warning-deep px-2 py-0.5 text-white transition-colors hover:brightness-95 disabled:opacity-60"
              >
                <X className="size-3" />
                Kembali ke Admin
              </button>
            </div>
          ) : null}

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
              <AccountMenu
                nama={nama}
                email={email}
                role={role}
                isAdmin={isAdmin}
                viewingAsLabel={viewingAsLabel}
                investors={investors}
              />
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
