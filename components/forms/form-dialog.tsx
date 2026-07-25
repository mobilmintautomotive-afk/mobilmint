'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/utils'
import type { AksiHasil } from '@/app/actions/_helper'

/**
 * Kerangka dialog form: mengurus state loading, toast sukses/gagal,
 * dan refresh data setelah simpan. Isi field-nya diserahkan ke `children`.
 */
export function FormDialog<T>({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  submitLabel = 'Simpan',
  successMessage = 'Data berhasil disimpan',
  onSubmit,
  children,
  disabled,
  extraFooter,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  submitLabel?: string
  successMessage?: string
  onSubmit: () => Promise<AksiHasil<T>>
  children: React.ReactNode
  disabled?: boolean
  extraFooter?: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await onSubmit()
      if (res.ok) {
        toast.success(successMessage)
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(res.error)
      }
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent size={size}>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>

          <DialogBody>{children}</DialogBody>

          <DialogFooter>
            {extraFooter}
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" loading={loading} disabled={disabled}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Grid 2 kolom untuk isi form (1 kolom di mobile). */
export function FormGrid({
  children,
  cols = 2,
}: {
  children: React.ReactNode
  cols?: 1 | 2 | 3
}) {
  return (
    <div
      className={
        cols === 1
          ? 'grid gap-4'
          : cols === 3
            ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
            : 'grid gap-4 sm:grid-cols-2'
      }
    >
      {children}
    </div>
  )
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h4 className="text-label font-semibold text-ink">{title}</h4>
        {description ? <p className="text-label text-ink-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

/** Jalankan server action dengan toast + refresh, untuk aksi non-form. */
export function useAksi() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  const jalankan = React.useCallback(
    async (
      fn: () => Promise<AksiHasil<any>>,
      opts?: { sukses?: string; onSelesai?: () => void },
    ) => {
      setLoading(true)
      try {
        const res = await fn()
        if (res.ok) {
          if (opts?.sukses) toast.success(opts.sukses)
          router.refresh()
          opts?.onSelesai?.()
          return true
        }
        toast.error(res.error)
        return false
      } catch (e) {
        toast.error(errorMessage(e))
        return false
      } finally {
        setLoading(false)
      }
    },
    [router],
  )

  return { jalankan, loading }
}
