import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatAngka, formatPersen, formatRupiah } from '@/lib/format'
import { Skeleton } from '@/components/ui/primitives'

export type MetricFormat = 'money' | 'number' | 'percent' | 'text'

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

      <p
        className={cn(
          'tnum text-ink',
          hero ? 'text-metric-hero' : 'text-[26px] font-bold leading-tight sm:text-metric',
        )}
      >
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
