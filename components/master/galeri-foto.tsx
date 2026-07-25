'use client'

import * as React from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/shared/states'

export function GaleriFoto({ urls, alt }: { urls: string[]; alt: string }) {
  const [aktif, setAktif] = React.useState(0)

  if (!urls || urls.length === 0) {
    return (
      <EmptyState
        icon={ImageOff}
        title="Belum ada foto unit"
        description="Tambahkan foto lewat tombol Edit supaya unit lebih mudah dikenali."
        className="py-10"
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="aspect-[16/10] w-full overflow-hidden rounded-lg bg-neutral-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[aktif]} alt={alt} className="size-full object-cover" />
      </div>

      {urls.length > 1 ? (
        <div className="mm-scroll flex gap-2 overflow-x-auto pb-1">
          {urls.map((u, i) => (
            <button
              key={u}
              type="button"
              onClick={() => setAktif(i)}
              className={cn(
                'size-16 shrink-0 overflow-hidden rounded-[10px] border-2 transition-colors',
                i === aktif ? 'border-accent' : 'border-transparent hover:border-line-strong',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`${alt} ${i + 1}`} className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
