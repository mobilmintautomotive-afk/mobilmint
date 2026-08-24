'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Eye, KeyRound, LogOut, ShieldCheck, User, Users } from 'lucide-react'
import { toast } from 'sonner'
import { logout } from '@/app/actions/auth'
import { setViewAs, clearViewAs } from '@/app/actions/view-as'
import { RoleBadge } from '@/components/shared/status-badge'
import type { UserRole } from '@/lib/constants'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/primitives'

export type InvestorOption = { id: string; nama: string }

export function AccountMenu({
  nama,
  email,
  role,
  isAdmin,
  viewingAsLabel,
  investors,
}: {
  nama: string
  email: string
  role: UserRole
  isAdmin: boolean
  viewingAsLabel: string | null
  investors: InvestorOption[]
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  function pilihHolding() {
    startTransition(async () => {
      await setViewAs('holding')
      toast.success('Sekarang melihat sebagai Holding')
      router.push('/dashboard')
      router.refresh()
    })
  }

  function pilihInvestor(inv: InvestorOption) {
    startTransition(async () => {
      await setViewAs('investor', inv.id)
      toast.success(`Sekarang melihat sebagai ${inv.nama}`)
      router.push('/investor')
      router.refresh()
    })
  }

  function kembaliKeAdmin() {
    startTransition(async () => {
      await clearViewAs()
      toast.success('Kembali ke tampilan Admin')
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-[10px] border border-line-strong bg-surface px-3 text-label text-ink transition-colors hover:bg-surface-alt',
            pending && 'opacity-60',
          )}
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <User className="size-3.5" />
          </span>
          <span className="max-w-[140px] truncate sm:max-w-none">{nama}</span>
          <ChevronDown className="size-4 text-ink-subtle" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>
          <div className="space-y-1">
            <p className="truncate font-medium text-ink">{nama}</p>
            <p className="truncate text-label font-normal text-ink-muted">{email}</p>
            <RoleBadge role={role} />
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <a href="/ganti-password" className="flex items-center gap-2">
            <KeyRound className="size-4" />
            Ganti Password
          </a>
        </DropdownMenuItem>

        {isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-1.5 text-ink-muted">
              <Eye className="size-3.5" />
              Lihat Sebagai
            </DropdownMenuLabel>

            {viewingAsLabel ? (
              <DropdownMenuItem onSelect={kembaliKeAdmin} className="flex items-center gap-2">
                <ShieldCheck className="size-4" />
                Admin (tampilan asli)
              </DropdownMenuItem>
            ) : null}

            <DropdownMenuItem
              onSelect={pilihHolding}
              className={cn(
                'flex items-center gap-2',
                !viewingAsLabel && role === 'holding' && 'bg-accent-soft text-accent',
              )}
            >
              <Users className="size-4" />
              Holding
            </DropdownMenuItem>

            {investors.length === 0 ? (
              <p className="px-3 py-2 text-label text-ink-muted">Belum ada data investor.</p>
            ) : (
              <div className="mm-scroll max-h-40 overflow-y-auto">
                {investors.map((inv) => (
                  <DropdownMenuItem
                    key={inv.id}
                    onSelect={() => pilihInvestor(inv)}
                    className={cn(
                      'pl-8',
                      viewingAsLabel === `Investor — ${inv.nama}` && 'bg-accent-soft text-accent',
                    )}
                  >
                    {inv.nama}
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() => startTransition(() => logout())}
          className="flex items-center gap-2 text-danger"
        >
          <LogOut className="size-4" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
