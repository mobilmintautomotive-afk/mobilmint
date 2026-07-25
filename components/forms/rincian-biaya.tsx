'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, MoneyInput, Label } from '@/components/ui/input'
import { Money } from '@/components/shared/money'
import type { RincianBiaya } from '@/types/database'

/** Baris biaya yang bisa ditambah-kurang (biaya lain pembelian & penjualan). */
export function RincianBiayaRows({
  label = 'Biaya Lain',
  rows,
  onChange,
  placeholder = 'Contoh: biaya lelang',
}: {
  label?: string
  rows: RincianBiaya[]
  onChange: (rows: RincianBiaya[]) => void
  placeholder?: string
}) {
  const total = rows.reduce((s, r) => s + (Number(r.nominal) || 0), 0)

  function ubah(i: number, patch: Partial<RincianBiaya>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([...rows, { nama: '', nominal: 0 }])}
        >
          <Plus />
          Tambah baris
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-line-strong px-3 py-3 text-label text-ink-muted">
          Belum ada biaya lain. Klik &ldquo;Tambah baris&rdquo; kalau ada biaya lelang, mutasi,
          derek, dan sejenisnya.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={r.nama}
                onChange={(e) => ubah(i, { nama: e.target.value })}
                placeholder={placeholder}
                className="flex-1"
                aria-label={`Nama biaya baris ${i + 1}`}
              />
              <div className="w-[180px]">
                <MoneyInput
                  value={r.nominal}
                  onChange={(v) => ubah(i, { nominal: v })}
                  aria-label={`Nominal biaya baris ${i + 1}`}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                aria-label="Hapus baris biaya"
                className="text-ink-subtle hover:text-danger"
              >
                <Trash2 />
              </Button>
            </div>
          ))}

          <div className="flex items-center justify-between border-t border-line pt-2">
            <span className="text-label text-ink-muted">Total {label.toLowerCase()}</span>
            <Money value={total} className="font-medium" />
          </div>
        </div>
      )}
    </div>
  )
}
