import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CalendarDays, Layers, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { PeriodFilter } from '@/components/shared/period-filter'
import { MetricCard } from '@/components/shared/metric-card'
import { Money } from '@/components/shared/money'
import { Card, CardDescription, CardTitle } from '@/components/ui/primitives'
import { OpexTable } from '@/components/laporan/opex-table'
import { getBiayaOperasional, getTotalBiaya } from '@/lib/queries/dashboard'
import { getCurrentRole, canWrite } from '@/lib/dev-role'
import { resolvePeriode, periodeSebelumnya, bulanDalamRentang } from '@/lib/periode'
import { hitungDelta } from '@/lib/calc'
import { formatPersen, formatTanggal } from '@/lib/format'
import { KATEGORI_OPEX } from '@/lib/constants'

export const metadata: Metadata = { title: 'Biaya Operasional' }

export default async function BiayaOperasionalPage({
  searchParams,
}: {
  searchParams: { periode?: string; from?: string; to?: string }
}) {
  const role = await getCurrentRole()
  if (role === 'investor') redirect('/investor')

  const rentang = resolvePeriode(searchParams)
  const sebelum = periodeSebelumnya(rentang)

  const [{ data: rows, error }, totalLalu, bolehTulis] = await Promise.all([
    getBiayaOperasional(rentang),
    getTotalBiaya(sebelum.from, sebelum.to),
    canWrite(),
  ])

  const total = rows.reduce((s: number, r: any) => s + r.nominal, 0)
  const jumlahBulan = Math.max(1, bulanDalamRentang(rentang).length)
  const rataPerBulan = Math.round(total / jumlahBulan)

  // Breakdown per kategori, urut dari yang terbesar
  const perKategori = new Map<string, number>()
  for (const k of KATEGORI_OPEX) perKategori.set(k, 0)
  for (const r of rows as any[]) {
    perKategori.set(r.kategori, (perKategori.get(r.kategori) ?? 0) + r.nominal)
  }
  const breakdown = Array.from(perKategori.entries())
    .filter(([, v]) => v > 0)
    .sort((a, z) => z[1] - a[1])

  const terbesar = breakdown[0]

  return (
    <>
      <PageHeader
        title="Biaya Operasional"
        description="Biaya jalannya usaha di luar unit mobil — gaji, sewa showroom, listrik, dan marketing. Biaya perbaikan unit dicatat terpisah di menu Perbaikan karena masuk HPP."
        breadcrumb={[{ label: 'Transaksi' }, { label: 'Biaya Operasional' }]}
        action={<PeriodFilter />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Total Biaya Periode"
          value={total}
          format="money"
          icon={Wallet}
          tone="warning"
          delta={hitungDelta(total, totalLalu)}
        />
        <MetricCard
          label="Rata-rata per Bulan"
          value={rataPerBulan}
          format="money"
          icon={CalendarDays}
          subtext={`Dibagi ${jumlahBulan} bulan dalam periode`}
        />
        <MetricCard
          label="Kategori Terbesar"
          value={terbesar ? terbesar[0] : '-'}
          format="text"
          icon={Layers}
          subtext={
            terbesar
              ? `${formatPersen((terbesar[1] / total) * 100)} dari total biaya`
              : 'Belum ada biaya tercatat'
          }
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardTitle>Rincian per Kategori</CardTitle>
          <CardDescription className="mb-4">
            {formatTanggal(rentang.from)} – {formatTanggal(rentang.to)}
          </CardDescription>

          {breakdown.length === 0 ? (
            <p className="rounded-[10px] bg-surface-alt px-3 py-6 text-center text-label text-ink-muted">
              Belum ada biaya operasional di periode ini.
            </p>
          ) : (
            <div className="space-y-3">
              {breakdown.map(([kategori, nominal]) => {
                const persen = total > 0 ? (nominal / total) * 100 : 0
                return (
                  <div key={kategori}>
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="text-body text-ink">{kategori}</span>
                      <span className="shrink-0 text-right">
                        <Money value={nominal} className="font-medium" />
                        <span className="ml-1.5 text-label tnum text-ink-muted">
                          {formatPersen(persen)}
                        </span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-soft">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.max(persen, 2)}%` }}
                      />
                    </div>
                  </div>
                )
              })}

              <div className="flex items-center justify-between border-t border-line pt-3">
                <span className="text-label font-semibold text-ink">Total</span>
                <Money value={total} className="font-semibold" />
              </div>
            </div>
          )}
        </Card>

        <div className="lg:col-span-2">
          <OpexTable rows={rows} error={error} canWrite={bolehTulis} pageSize={20} />
        </div>
      </div>
    </>
  )
}
