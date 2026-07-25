'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SearchableSelect } from '@/components/ui/select'

/**
 * Pilih entitas laporan: Pengelola atau salah satu investor.
 * Disimpan di URL (?entitas=pengelola atau ?entitas=<investor_id>) supaya
 * bisa di-refresh/dibagikan dan Server Component yang merender datanya.
 */
export function EntitasSelector({
  investors,
  aktif,
}: {
  investors: { id: string; nama: string }[]
  aktif: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = React.useTransition()

  function pilih(entitas: string) {
    const sp = new URLSearchParams(params.toString())
    sp.set('entitas', entitas)
    startTransition(() => router.push(`${pathname}?${sp.toString()}`, { scroll: false }))
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', pending && 'opacity-70')}>
      <button
        type="button"
        onClick={() => pilih('pengelola')}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-[10px] px-3 text-body font-medium transition-colors',
          aktif === 'pengelola'
            ? 'bg-cta text-white'
            : 'bg-surface text-ink-muted border border-line-strong hover:bg-surface-alt',
        )}
      >
        <Briefcase className="size-4" />
        Pengelola
      </button>

      <div className="w-[240px]">
        <SearchableSelect
          options={investors.map((i) => ({ value: i.id, label: i.nama }))}
          value={aktif !== 'pengelola' ? aktif : ''}
          onChange={pilih}
          placeholder="Atau pilih investor..."
          searchPlaceholder="Cari nama investor..."
          emptyText="Investor tidak ditemukan"
        />
      </div>
    </div>
  )
}
