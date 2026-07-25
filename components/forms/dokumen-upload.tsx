'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { FileCheck2, Loader2, Paperclip, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/lib/utils'
import { uploadDokumen } from '@/app/actions/upload'

/**
 * Upload satu dokumen (bukti transfer, dll) ke bucket privat `documents`
 * lewat server action — tidak pernah menyentuh Storage langsung dari
 * browser. Nilai yang dikirim ke form adalah storage path, bukan URL
 * publik (karena bucketnya privat).
 */
export function DokumenUpload({
  value,
  onChange,
  namaFile,
  onNamaFileChange,
  disabled,
}: {
  value: string | null
  onChange: (path: string | null) => void
  namaFile?: string | null
  onNamaFileChange?: (nama: string | null) => void
  disabled?: boolean
}) {
  const [uploading, setUploading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  async function pilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fd = new FormData()
      fd.set('file', file)
      const res = await uploadDokumen(fd)
      if (!res.ok) throw new Error(res.error)
      onChange(res.data.path)
      onNamaFileChange?.(file.name)
      toast.success('Bukti transfer berhasil diunggah')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-[10px] border border-line bg-surface-alt px-3 py-2.5">
        <span className="flex min-w-0 items-center gap-2 text-label text-ink">
          <FileCheck2 className="size-4 shrink-0 text-success" />
          <span className="truncate">{namaFile || 'Bukti transfer terunggah'}</span>
        </span>
        {!disabled ? (
          <button
            type="button"
            onClick={() => {
              onChange(null)
              onNamaFileChange?.(null)
            }}
            className="shrink-0 text-ink-subtle hover:text-danger"
            aria-label="Hapus bukti transfer"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-line-strong px-3 py-2.5 text-label text-ink-subtle transition-colors hover:border-accent hover:text-accent',
          uploading && 'opacity-60',
        )}
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
        {uploading ? 'Mengunggah...' : 'Unggah Bukti Transfer (opsional)'}
      </button>
      <input ref={inputRef} type="file" accept="image/*,.pdf" hidden onChange={pilihFile} />
    </div>
  )
}
