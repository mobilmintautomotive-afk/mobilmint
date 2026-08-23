import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatAngka, formatPersen, formatRupiah } from '@/lib/format'
import { Skeleton } from '@/components/ui/primitives'

export type MetricFormat = 'money' | 'number' | 'percent' | 'text'

/**
 * Angka tetap tampil penuh (presisi rupiah dipertahankan), ukurannya yang
 * menyesuaikan supaya tidak pernah wrap jadi 2 baris.
 *
 * Dua faktor menentukan lebar yang tersedia: panjang teks, dan jumlah kolom
 * grid di breakpoint itu. Yang paling sempit justru `xl` (1280px) — di situ
 * grid sudah 4 kolom tapi layar belum lebar, jadi ukurannya paling kecil.
 * Di `2xl` kartunya melebar lagi sehingga angka boleh kembali besar.
 */
function ukuranAngka(teks: string, hero: boolean) {
  const panjang = teks.length > 13
  if (hero) return panjang ? 'text-[30px] xl:text-[26px] 2xl:text-metric' : 'text-metric-hero xl:text-[32px] 2xl:text-metric-hero'
  if (panjang) return 'text-[26px] xl:text-[20px] 2xl:text-[27px]'
  return 'text-[26px] xl:text-[24px] 2xl:text-metric'
}

export function MetricCard({
  label,
  value,
  format = 'number',
  delta,
  subtext,
  icon: Icon,
  tone = 'default',
  hero = false,
  action,
  className,
}: {
  label: string
  value: number | string
  format?: MetricFormat
  /** persentase perubahan vs periode sebelumnya; null = tidak ada pembanding */
  delta?: number | null
  subtext?: React.ReactNode
  icon?: LucideIcon
  tone?: 'default' | 'success' | 'warning' | 'danger'
  /** angka ekstra besar — dipakai untuk kartu "Saldo Anda" */
  hero?: boolean
  action?: React.ReactNode
  className?: string
}) {
  const display =
    format === 'money'
      ? formatRupiah(value as number)
      : format === 'percent'
        ? formatPersen(value as number)
        : format === 'number'
          ? formatAngka(value as number)
          : String(value)

  return (
    <div className={cn('mm-card flex flex-col justify-between gap-3', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <p className="mm-label-caps">{label}</p>
          {action}
        </div>
        {Icon ? (
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-[10px]',
              tone === 'default' && 'bg-accent-soft text-accent',
              tone === 'success' && 'bg-success-soft text-success',
              tone === 'warning' && 'bg-warning-soft text-warning-deep',
              tone === 'danger' && 'bg-danger-soft text-danger',
            )}
          >
            <Icon className="size-[18px]" />
          </span>
        ) : null}
      </div>

      <p className={cn('tnum font-bold leading-tight text-ink', ukuranAngka(display, hero))}>
        {display}
      </p>

      <div className="min-h-[18px]">
        {delta !== undefined && delta !== null ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-label font-medium',
              delta >= 0 ? 'text-success' : 'text-danger',
            )}
          >
            {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {formatPersen(Math.abs(delta))} vs periode lalu
          </span>
        ) : subtext ? (
          <span className="text-label text-ink-muted">{subtext}</span>
        ) : null}
      </div>
    </div>
  )
}

export function MetricCardSkeleton() {
  return (
    <div className="mm-card space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="size-9 rounded-[10px]" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-28" />
    </div>
  )
}
