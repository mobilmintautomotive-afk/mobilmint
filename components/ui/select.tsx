'use client'

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-10 w-full items-center justify-between gap-2 rounded-[10px] border border-line-strong bg-surface px-3 text-body text-ink transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:bg-surface-alt data-[placeholder]:text-ink-subtle',
      className,
    )}
    {...props}
  >
    <span className="truncate text-left">{children}</span>
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="size-4 shrink-0 text-ink-subtle" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = 'SelectTrigger'

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        'relative z-50 max-h-72 min-w-[8rem] overflow-hidden rounded-lg border border-line bg-surface shadow-lg',
        'data-[state=open]:animate-fade-in',
        position === 'popper' && 'data-[side=bottom]:translate-y-1 w-[var(--radix-select-trigger-width)]',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = 'SelectContent'

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-sm py-2 pl-3 pr-8 text-body text-ink outline-none data-[highlighted]:bg-accent-soft data-[highlighted]:text-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <span className="absolute right-2 flex size-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="size-4 text-accent" />
      </SelectPrimitive.ItemIndicator>
    </span>
  </SelectPrimitive.Item>
))
SelectItem.displayName = 'SelectItem'

export const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('px-3 py-1.5 text-caps uppercase text-ink-subtle', className)}
    {...props}
  />
))
SelectLabel.displayName = 'SelectLabel'

/* ------------------------------------------------------------------ */
/* Combobox dengan pencarian — dipakai untuk dropdown investor/unit/    */
/* customer yang jumlahnya banyak.                                      */
/* ------------------------------------------------------------------ */

export type ComboOption = {
  value: string
  label: string
  keterangan?: string
  disabled?: boolean
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Pilih...',
  searchPlaceholder = 'Cari...',
  emptyText = 'Tidak ada data',
  disabled,
  footer,
  className,
  id,
}: {
  options: ComboOption[]
  value?: string | null
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  footer?: React.ReactNode
  className?: string
  id?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const rootRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const selected = options.find((o) => o.value === value)
  const filtered = q
    ? options.filter((o) =>
        `${o.label} ${o.keterangan ?? ''}`.toLowerCase().includes(q.toLowerCase()),
      )
    : options

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-[10px] border border-line-strong bg-surface px-3 text-body transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:bg-surface-alt',
          selected ? 'text-ink' : 'text-ink-subtle',
        )}
      >
        <span className="truncate text-left">{selected?.label ?? placeholder}</span>
        <ChevronDown className="size-4 shrink-0 text-ink-subtle" />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full animate-fade-in overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search className="size-4 shrink-0 text-ink-subtle" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 w-full bg-transparent text-body text-ink outline-none placeholder:text-ink-subtle"
            />
          </div>

          <div className="mm-scroll max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-label text-ink-muted">{emptyText}</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  disabled={o.disabled}
                  onClick={() => {
                    onChange(o.value)
                    setOpen(false)
                    setQ('')
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-body transition-colors hover:bg-accent-soft hover:text-accent disabled:pointer-events-none disabled:opacity-50',
                    o.value === value ? 'bg-accent-soft text-accent' : 'text-ink',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{o.label}</span>
                    {o.keterangan ? (
                      <span className="block truncate text-label text-ink-muted">
                        {o.keterangan}
                      </span>
                    ) : null}
                  </span>
                  {o.value === value ? <Check className="size-4 shrink-0" /> : null}
                </button>
              ))
            )}
          </div>

          {footer ? <div className="border-t border-line p-1">{footer}</div> : null}
        </div>
      ) : null}
    </div>
  )
}
