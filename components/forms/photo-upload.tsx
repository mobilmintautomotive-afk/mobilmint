'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, errorMessage } from '@/lib/utils'

const BUCKET = 'car-photos'

/**
 * Multi-upload foto unit ke Supabase Storage (maks 10).
 * Nilai yang disimpan ke form adalah array public URL.
 */
export function PhotoUpload({
  value,
  onChange,
  max = 10,
  disabled,
}: {
  value: string[]
  onChange: (urls: string[]) => void
  max?: number
  disabled?: boolean
}) {
  const [uploading, setUploading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  async function pilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    if (value.length + files.length > max) {
      toast.error(`Maksimal ${max} foto per unit.`)
      e.target.value = ''
      return
    }

    setUploading(true)
    try {
      const db = createClient()
      const urls: string[] = []
      for (const file of files) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        const path = `${crypto.randomUUID()}.${ext}`
        const { error } = await db.storage.from(BUCKET).upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        })
        if (error) throw new Error(error.message)
        const { data } = db.storage.from(BUCKET).getPublicUrl(path)
        urls.push(data.publicUrl)
      }
      onChange([...value, ...urls])
      toast.success(`${urls.length} foto berhasil diunggah`)
    } catch (err) {
      toast.error(
        `Gagal mengunggah foto: ${errorMessage(err)}. Pastikan bucket "${BUCKET}" sudah dibuat di Supabase Storage.`,
      )
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={url} className="group relative size-20 overflow-hidden rounded-[10px] border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Foto unit ${i + 1}`} className="size-full object-cover" />
            {!disabled ? (
              <button
                type="button"
                onClick={() => onChange(value.filter((u) => u !== url))}
                className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-ink/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Hapus foto"
              >
                <X className="size-3" />
              </button>
            ) : null}
          </div>
        ))}

        {!disabled && value.length < max ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              'grid size-20 place-items-center rounded-[10px] border border-dashed border-line-strong text-ink-subtle transition-colors hover:border-accent hover:text-accent',
              uploading && 'opacity-60',
            )}
          >
            {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={pilihFile}
      />
      <p className="text-label text-ink-muted">
        {value.length}/{max} foto. Format JPG/PNG, unggah ke bucket <code>{BUCKET}</code>.
      </p>
    </div>
  )
}
