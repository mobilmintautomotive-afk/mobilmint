'use client'

import * as React from 'react'
import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'

export type AksiBaris = {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  href?: string
  onSelect?: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
  /** Alasan kenapa aksi dimatikan — tampil sebagai title. */
  alasan?: string
}

export function RowActions({ actions }: { actions: AksiBaris[] }) {
  const tampil = actions.filter(Boolean)
  if (tampil.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Aksi baris">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {tampil.map((a, i) => {
          const Icon = a.icon
          const isi = (
            <>
              {Icon ? <Icon className="size-4" /> : null}
              {a.label}
            </>
          )
          return (
            <React.Fragment key={a.label}>
              {a.tone === 'danger' && i > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                tone={a.tone}
                disabled={a.disabled}
                title={a.disabled ? a.alasan : undefined}
                onSelect={(e) => {
                  if (a.href) return
                  e.preventDefault()
                  a.onSelect?.()
                }}
                asChild={Boolean(a.href)}
              >
                {a.href ? <Link href={a.href}>{isi}</Link> : isi}
              </DropdownMenuItem>
            </React.Fragment>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
