import { cn } from '@/lib/utils'
import { formatRupiah, toNumber } from '@/lib/format'

/**
 * Render uang: `Rp 125.000.000`.
 * Nilai negatif ditulis `-Rp 5.000.000` (PRD 04 bagian 2.5).
 */
export function Money({
  value,
  colored = false,
  size = 'md',
  className,
}: {
  value: number | string | null | undefined
  /** positif hijau / negatif merah */
  colored?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero'
  className?: string
}) {
  const n = toNumber(value)
  return (
    <span
      className={cn(
        'tnum',
        size === 'sm' && 'text-label',
        size === 'md' && 'text-body',
        size === 'lg' && 'text-card-title font-semibold',
        size === 'xl' && 'text-metric',
        size === 'hero' && 'text-metric-hero',
        colored && (n < 0 ? 'text-danger' : n > 0 ? 'text-success' : 'text-ink-muted'),
        className,
      )}
    >
      {formatRupiah(n)}
    </span>
  )
}
