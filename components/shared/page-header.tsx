import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  breadcrumb,
  action,
  className,
}: {
  title: string
  description?: string
  breadcrumb?: { label: string; href?: string }[]
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav className="mb-1.5 flex flex-wrap items-center gap-1 text-label text-ink-muted">
            {breadcrumb.map((b, i) => (
              <span key={`${b.label}-${i}`} className="inline-flex items-center gap-1">
                {i > 0 ? <ChevronRight className="size-3.5 text-ink-subtle" /> : null}
                {b.href ? (
                  <Link href={b.href} className="transition-colors hover:text-accent">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-ink-subtle">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="truncate text-page-title text-ink">{title}</h1>
        {description ? <p className="mt-1 text-label text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  )
}
