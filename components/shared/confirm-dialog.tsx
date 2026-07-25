'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { errorMessage } from '@/lib/utils'

/**
 * Dialog konfirmasi untuk semua aksi destruktif / tidak bisa dibatalkan.
 * Dipakai lewat hook `useConfirm()` supaya pemanggilnya ringkas.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  variant = 'destructive',
  onConfirm,
  successMessage,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'destructive' | 'primary' | 'accent'
  onConfirm: () => void | Promise<void>
  successMessage?: string
}) {
  const [loading, setLoading] = React.useState(false)

  async function handle(e: React.MouseEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await onConfirm()
      if (successMessage) toast.success(successMessage)
      onOpenChange(false)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction variant={variant} onClick={handle} disabled={loading}>
            {loading ? 'Memproses...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

type ConfirmOptions = Omit<
  React.ComponentProps<typeof ConfirmDialog>,
  'open' | 'onOpenChange'
>

export function useConfirm() {
  const [state, setState] = React.useState<ConfirmOptions | null>(null)

  const dialog = state ? (
    <ConfirmDialog {...state} open onOpenChange={(v) => !v && setState(null)} />
  ) : null

  return { confirm: setState, dialog }
}
