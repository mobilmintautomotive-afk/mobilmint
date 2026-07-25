import { MetricCardSkeleton } from '@/components/shared/metric-card'
import { TableSkeleton } from '@/components/shared/states'
import { Skeleton } from '@/components/ui/primitives'

export default function AppLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-5 space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-lg bg-surface shadow">
        <TableSkeleton rows={8} cols={6} />
      </div>
    </div>
  )
}
