import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { PeriodFilter } from '@/components/shared/period-filter'
import { Money } from '@/components/shared/money'
import { ErrorState } from '@/components/shared/states'
import { ChartCard } from '@/components/charts/chart-shell'
import { WaterfallChart } from '@/components/charts/waterfall-chart'
import { Card, CardTitle } from '@/components/ui/primitives'
import { TombolExportLaporan } from '@/components/laporan/tombol-export'
import { LaporanPerUnitTable } from '@/components/laporan/per-unit-table'
import { OpexTable } from '@/components/laporan/opex-table'
import {
  getBiayaOperasional,
  getDataDashboard,
  getLaporanPerUnit,
} from '@/lib/queries/dashboard'
import { getCurrentRole, canWrite } from '@/lib/dev-role'
import { resolvePeriode } from '@/lib/periode'
import { formatTanggal } from '@/lib/format'

export const metadata: Metadata = { title: 'Laporan Laba Rugi' }

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: { periode?: string; from?: string; to?: string }
}) {
  const role = await getCurrentRole()
  if (role === 'investor') redirect('/investor')

  const rentang = resolvePeriode(searchParams)
  const [dash, perUnit, opex, bolehTulis] = await Promise.all([
    getDataDashboard(rentang),
    getLaporanPerUnit(rentang),
    getBiayaOperasional(rentang),
    canWrite(),
  ])

  const lr = dash.data.labaRugi
  const labaKotor = lr.pendapatan - lr.hppPembelian - lr.biayaPerbaikan

  const periodeQuery = new URLSearchParams({
    periode: rentang.preset,
    ...(rentang.preset === 'custom' ? { from: rentang.from, to: rentang.to } : {}),
  }).toString()

  return (
    <>
      <PageHeader
        title="Laporan Laba Rugi"
        description={`${rentang.label} · ${formatTanggal(rentang.from)} – ${formatTanggal(rentang.to)}`}
        breadcrumb={[{ label: 'Laporan' }, { label: 'Laba Rugi' }]}
        action={
          <TombolExportLaporan
            periodeQuery={periodeQuery}
            periodeLabel={rentang.label}
            rows={perUnit.data}
            ringkasan={lr as unknown as Record<string, number>}
          />
        }
      />

      <div className="mb-5">
        <PeriodFilter />
      </div>

      {dash.error ? (
        <div className="mm-card mb-5">
          <ErrorState description={dash.error} />
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardTitle className="mb-4">Ringkasan Periode</CardTitle>
          <div className="space-y-1">
            <Baris label="Pendapatan Penjualan" value={lr.pendapatan} />
            <Baris label="Harga Pokok Pembelian" value={-lr.hppPembelian} sub />
            <Baris label="Biaya Perbaikan" value={-lr.biayaPerbaikan} sub />
            <Pemisah />
            <Baris label="Laba Kotor" value={labaKotor} tebal />
            <Baris label="Komisi Sales" value={-lr.komisiSales} sub />
            <Baris label="Biaya Penjualan Lain" value={-lr.biayaPenjualanLain} sub />
            <Baris label="Biaya Operasional" value={-lr.biayaOperasional} sub />
            <Pemisah tebal />
            <Baris label="Laba Bersih" value={lr.labaBersih} tebal besar />
            <Baris label="Bagi Hasil Investor" value={-lr.bagiHasilInvestor} sub />
            <Pemisah tebal />
            <Baris label="Laba Bersih Pengelola" value={lr.labaPengelola} tebal besar />
          </div>
        </Card>

        <ChartCard
          title="Waterfall Laba Rugi"
          description="Alur dari pendapatan sampai laba yang jadi hak pengelola."
          className="lg:col-span-3"
        >
          <WaterfallChart data={dash.data.waterfall} height={340} />
        </ChartCard>
      </div>

      <div className="mt-5">
        <h2 className="mb-3 text-card-title text-ink">Rincian per Unit</h2>
        <LaporanPerUnitTable rows={perUnit.data} error={perUnit.error} />
      </div>

      <div className="mt-5">
        <h2 className="mb-3 text-card-title text-ink">Biaya Operasional</h2>
        <OpexTable rows={opex.data} error={opex.error} canWrite={bolehTulis} />
      </div>
    </>
  )
}

function Baris({
  label,
  value,
  sub,
  tebal,
  besar,
}: {
  label: string
  value: number
  sub?: boolean
  tebal?: boolean
  besar?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span
        className={
          sub
            ? 'pl-3 text-label text-ink-muted'
            : tebal
              ? 'font-semibold text-ink'
              : 'text-body text-ink'
        }
      >
        {label}
      </span>
      <Money
        value={value}
        size={besar ? 'lg' : 'md'}
        colored={besar}
        className={sub ? 'text-label text-ink-muted' : tebal ? 'font-semibold' : ''}
      />
    </div>
  )
}

function Pemisah({ tebal }: { tebal?: boolean }) {
  return <div className={tebal ? 'my-1 border-t border-ink/20' : 'my-1 border-t border-line'} />
}
