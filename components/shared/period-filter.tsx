'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CalendarRange } from 'lucide-react'
import { PERIODE_PRESET, type PeriodePreset } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

/**
 * Filter periode global (PRD 02 bagian C1). Nilainya disimpan di URL
 * supaya semua kartu & chart di halaman ikut berubah lewat Server Component.
 */
export function PeriodFilter({
  className,
  years,
}: {
  className?: string
  /** Daftar tahun yang punya data, untuk isi dropdown preset "Pilih Tahun". */
  years?: number[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = React.useTransition()

  const aktif = (params.get('periode') as PeriodePreset) || 'tahun-ini'
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const tahunSekarang = new Date().getFullYear()
  const tahunOptions = years && years.length > 0 ? years : [tahunSekarang]
  const year = params.get('year') ?? String(tahunOptions[0])

  function set(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') sp.delete(k)
      else sp.set(k, v)
    }
    startTransition(() => router.push(`${pathname}?${sp.toString()}`, { scroll: false }))
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', pending && 'opacity-70', className)}>
      <div className="flex items-center gap-1 rounded-[10px] bg-neutral-soft p-1">
        {PERIODE_PRESET.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() =>
              set(
                p.value === 'custom'
                  ? { periode: 'custom', year: null }
                  : p.value === 'tahun'
                    ? { periode: 'tahun', from: null, to: null, year }
                    : { periode: p.value, from: null, to: null, year: null },
              )
            }
            className={cn(
              'h-8 whitespace-nowrap rounded-sm px-3 text-label font-medium transition-colors',
              aktif === p.value
                ? 'bg-surface text-ink shadow-sm'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {aktif === 'tahun' ? (
        <select
          value={year}
          onChange={(e) => set({ year: e.target.value })}
          aria-label="Pilih tahun"
          className="h-9 rounded-[10px] border border-line-strong bg-surface px-3 text-body text-ink transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        >
          {tahunOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      ) : null}

      {aktif === 'custom' ? (
        <div className="flex items-center gap-2">
          <CalendarRange className="size-4 text-ink-subtle" />
          <Input
            type="date"
            value={from}
            onChange={(e) => set({ from: e.target.value })}
            className="h-9 w-[150px]"
            aria-label="Dari tanggal"
          />
          <span className="text-label text-ink-muted">s/d</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => set({ to: e.target.value })}
            className="h-9 w-[150px]"
            aria-label="Sampai tanggal"
          />
        </div>
      ) : null}
    </div>
  )
}
