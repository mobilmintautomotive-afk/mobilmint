'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, FlaskConical } from 'lucide-react'
import { setDevRole } from '@/app/actions/dev-role'
import { USER_ROLE_LABEL, type UserRole } from '@/lib/constants'
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

/**
 * ==============================================================
 * KOMPONEN SEMENTARA FASE 1–4 — HAPUS DI FASE 5
 * ==============================================================
 * Menggantikan login. Mengubah cookie role lalu refresh halaman,
 * sehingga Server Component membaca role baru lewat lib/dev-role.ts.
 */
export function RoleSwitcher({
  role,
  investorId,
  investors,
}: {
  role: UserRole
  investorId: string | null
  investors: InvestorOption[]
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  const investorAktif = investors.find((i) => i.id === investorId)
  const teks =
    role === 'investor'
      ? `Investor — ${investorAktif?.nama ?? 'pilih investor'}`
      : USER_ROLE_LABEL[role]

  function pilih(next: UserRole, id?: string) {
    startTransition(async () => {
      await setDevRole(next, id ?? null)
      router.push(next === 'investor' ? '/investor' : '/dashboard')
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-[10px] border border-dashed border-line-strong bg-surface px-3 text-label text-ink transition-colors hover:bg-surface-alt',
            pending && 'opacity-60',
          )}
          title="Role switcher — mode development, akan dihapus setelah login aktif"
        >
          <FlaskConical className="size-4 text-warning-deep" />
          <span className="max-w-[160px] truncate sm:max-w-none">{teks}</span>
          <ChevronDown className="size-4 text-ink-subtle" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Mode development</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => pilih('admin')}>Admin</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => pilih('holding')}>Holding</DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Masuk sebagai investor</DropdownMenuLabel>

        {investors.length === 0 ? (
          <p className="px-3 py-2 text-label text-ink-muted">Belum ada data investor.</p>
        ) : (
          <div className="mm-scroll max-h-56 overflow-y-auto">
            {investors.map((inv) => (
              <DropdownMenuItem
                key={inv.id}
                onSelect={() => pilih('investor', inv.id)}
                className={cn(role === 'investor' && investorId === inv.id && 'bg-accent-soft text-accent')}
              >
                {inv.nama}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
