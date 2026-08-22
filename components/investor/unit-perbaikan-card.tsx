import { Wrench } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/primitives'
import { StatusBadge } from '@/components/shared/status-badge'
import { Money } from '@/components/shared/money'
import { formatTanggal } from '@/lib/format'

export type UnitPerbaikan = {
  car_id: string
  unit: string
  no_polisi: string | null
  hari_di_bengkel: number
  perbaikan: {
    id: string
    jenis_perbaikan: string
    deskripsi: string | null
    vendor_nama: string
    biaya: number
    status: string
    tanggal_masuk: string
    tanggal_selesai: string | null
  }[]
}

/**
 * Progres perbaikan unit yang didanai investor — supaya investor tahu
 * unitnya sedang dikerjakan apa, bukan cuma badge status "Perbaikan" polos.
 */
export function UnitPerbaikanCard({ rows }: { rows: UnitPerbaikan[] }) {
  if (rows.length === 0) return null

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center gap-2">
        <Wrench className="size-4 text-ink-subtle" />
        <h2 className="text-card-title text-ink">Unit Anda yang Sedang Diperbaiki</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((u) => (
          <Card key={u.car_id}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="truncate">{u.unit}</CardTitle>
                <p className="text-label text-ink-muted">{u.no_polisi ?? 'Tanpa no. polisi'}</p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-label tnum text-warning-deep">
                {u.hari_di_bengkel} hari di bengkel
              </span>
            </div>

            {u.perbaikan.length === 0 ? (
              <p className="text-label text-ink-muted">Belum ada rincian pengerjaan tercatat.</p>
            ) : (
              <ul className="divide-y divide-line">
                {u.perbaikan.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{p.jenis_perbaikan}</p>
                      <p className="text-label text-ink-muted">
                        {p.vendor_nama} · masuk {formatTanggal(p.tanggal_masuk)}
                        {p.tanggal_selesai ? ` · selesai ${formatTanggal(p.tanggal_selesai)}` : ''}
                      </p>
                      {p.deskripsi ? (
                        <p className="mt-0.5 truncate text-label text-ink-subtle">{p.deskripsi}</p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <Money value={p.biaya} className="block text-label font-medium" />
                      <StatusBadge status={p.status} className="mt-1" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
