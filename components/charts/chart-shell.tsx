'use client'

import { cn } from '@/lib/utils'
import { formatRupiah } from '@/lib/format'
import { CHART_COLORS } from '@/lib/constants'

export const chartColors = CHART_COLORS

export function ChartCard({
  title,
  description,
  action,
  children,
  footnote,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  /** Satu kalimat penjelas di bawah chart (wajib untuk dashboard investor). */
  footnote?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mm-card', className)}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-card-title text-ink">{title}</h3>
          {description ? <p className="mt-0.5 text-label text-ink-muted">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
      {footnote ? (
        <p className="mt-3 border-t border-line pt-3 text-label text-ink-muted">{footnote}</p>
      ) : null}
    </div>
  )
}

/** Tooltip kartu putih, nilai uang sudah terformat (PRD 04 bagian 2.7). */
export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean
  payload?: any[]
  label?: string
  formatter?: (entry: any) => React.ReactNode
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[10px] bg-surface px-3 py-2 shadow-lg">
      {label ? <p className="mb-1 text-label font-medium text-ink">{label}</p> : null}
      <div className="space-y-0.5">
        {payload
          .filter((p) => p.dataKey !== '_base')
          .map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-label">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: p.color ?? p.fill }}
              />
              <span className="text-ink-muted">{p.name}</span>
              <span className="ml-auto tnum font-medium text-ink">
                {formatter ? formatter(p) : formatRupiah(p.value)}
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}
