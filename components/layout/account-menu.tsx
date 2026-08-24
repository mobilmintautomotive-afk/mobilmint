'use client'

import * as React from 'react'
import { ChevronDown, KeyRound, LogOut, User } from 'lucide-react'
import { logout } from '@/app/actions/auth'
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

export function AccountMenu({
  nama,
  email,
  role,
}: {
  nama: string
  email: string
  role: UserRole
}) {
  const [pending, startTransition] = React.useTransition()

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

      <DropdownMenuContent align="end" className="w-64">
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
