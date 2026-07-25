'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronDown, FileBarChart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { Money } from '@/components/shared/money'
import { BagiHasilBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { formatTanggal } from '@/lib/format'
import type { BarisLaporan } from './tombol-export'

type Baris = BarisLaporan & {
  id: string
  car_id: string
  sudah_dibagi: boolean
}

/** Tabel laba rugi per unit dengan baris yang bisa dibuka (expandable). */
export function LaporanPerUnitTable({
  rows,
  error,
}: {
  rows: Baris[]
  error: string | null
}) {
  const [buka, setBuka] = React.useState<string | null>(null)

  if (error) {
    return (
      <div className="mm-card">
        <ErrorState description={error} />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="mm-card">
        <EmptyState
          icon={FileBarChart}
          title="Belum ada penjualan di periode ini"
          description="Coba pilih rentang periode yang lebih panjang."
        />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg bg-surface shadow">
      <div className="mm-scroll overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-alt">
            <tr>
              <th className="px-4 py-3 text-left text-caps uppercase text-ink-subtle">Unit</th>
              <th className="px-4 py-3 text-left text-caps uppercase text-ink-subtle">Tanggal</th>
              <th className="px-4 py-3 text-right text-caps uppercase text-ink-subtle">Harga Jual</th>
              <th className="px-4 py-3 text-right text-caps uppercase text-ink-subtle">HPP</th>
              <th className="px-4 py-3 text-right text-caps uppercase text-ink-subtle">Laba Bersih</th>
              <th className="px-4 py-3 text-center text-caps uppercase text-ink-subtle">Bagi Hasil</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const terbuka = buka === r.id
              return (
                <React.Fragment key={r.id}>
                  <tr
                    className="cursor-pointer border-t border-line transition-colors hover:bg-surface-alt"
                    onClick={() => setBuka(terbuka ? null : r.id)}
                    style={{ height: 52 }}
                  >
                    <td className="px-4 py-2">
                      <span className="block font-medium text-ink">{r.unit}</span>
                      <span className="block text-label text-ink-muted">
                        {r.no_polisi ?? '-'} · {r.no_transaksi}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-body text-ink-muted">
                      {formatTanggal(r.tanggal_jual)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Money value={r.harga_jual} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Money value={r.hpp} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Money value={r.laba_bersih} colored className="font-medium" />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <BagiHasilBadge sudah={r.sudah_dibagi} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ChevronDown
                        className={cn(
                          'inline size-4 text-ink-subtle transition-transform',
                          terbuka && 'rotate-180',
                        )}
                      />
                    </td>
                  </tr>

                  {terbuka ? (
                    <tr className="border-t border-line bg-surface-alt">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <Detail label="Modal Pembelian" value={r.modal_pembelian} />
                          <Detail label="Biaya Perbaikan" value={r.biaya_perbaikan} />
                          <Detail label="Komisi Sales" value={r.komisi_sales} />
                          <Detail label="Biaya Lain" value={r.biaya_lain} />
                          <Detail label="Laba Kotor" value={r.laba_kotor} colored />
                          <Detail label="Laba Bersih" value={r.laba_bersih} colored />
                          <Detail label="Bagi Hasil Investor" value={r.bagi_hasil_investor} />
                          <Detail label="Bagi Hasil Pengelola" value={r.bagi_hasil_pengelola} />
                        </div>
                        <div className="mt-3">
                          <Button asChild variant="secondary" size="sm">
                            <Link href={`/master/mobil/${r.car_id}`}>Buka detail unit</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Detail({ label, value, colored }: { label: string; value: number; colored?: boolean }) {
  return (
    <div className="rounded-[10px] bg-surface p-3">
      <p className="mm-label-caps">{label}</p>
      <Money value={value} colored={colored} className="mt-0.5 block font-medium" />
    </div>
  )
}
