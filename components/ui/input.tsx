'use client'

import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'
import { formatRupiahInput, parseRupiahInput } from '@/lib/format'

const baseField =
  'w-full rounded-[10px] border border-line-strong bg-surface px-3 text-body text-ink placeholder:text-ink-subtle transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-ink-muted'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(baseField, 'h-10', className)} {...props} />
  ),
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(baseField, 'min-h-[88px] py-2.5', className)} {...props} />
))
Textarea.displayName = 'Textarea'

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { required?: boolean }
>(({ className, children, required, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('block text-label font-medium text-ink', className)}
    {...props}
  >
    {children}
    {required ? <span className="ml-0.5 text-danger">*</span> : null}
  </LabelPrimitive.Root>
))
Label.displayName = 'Label'

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null
  return <p className="mt-1 text-label text-danger">{children}</p>
}

export function FieldHint({ children }: { children?: React.ReactNode }) {
  if (!children) return null
  return <p className="mt-1 text-label text-ink-muted">{children}</p>
}

/** Wrapper label + field + pesan error, dipakai di semua form. */
export function Field({
  label,
  required,
  error,
  hint,
  htmlFor,
  className,
  children,
}: {
  label?: string
  required?: boolean
  error?: string
  hint?: string
  htmlFor?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      ) : null}
      {children}
      <FieldError>{error}</FieldError>
      {!error ? <FieldHint>{hint}</FieldHint> : null}
    </div>
  )
}

/**
 * Input uang: user mengetik angka, tampil dengan pemisah ribuan,
 * nilai yang dikirim ke form tetap number rupiah penuh.
 */
export const MoneyInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
    value?: number | null
    onChange?: (value: number) => void
  }
>(({ className, value, onChange, ...props }, ref) => {
  const [text, setText] = React.useState(() => formatRupiahInput(value))

  React.useEffect(() => {
    const parsed = parseRupiahInput(text)
    if ((value ?? 0) !== parsed) setText(formatRupiahInput(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body text-ink-muted">
        Rp
      </span>
      <input
        ref={ref}
        inputMode="numeric"
        className={cn(baseField, 'h-10 pl-9 tnum', className)}
        value={text}
        onChange={(e) => {
          const n = parseRupiahInput(e.target.value)
          setText(formatRupiahInput(n))
          onChange?.(n)
        }}
        placeholder="0"
        {...props}
      />
    </div>
  )
})
MoneyInput.displayName = 'MoneyInput'
