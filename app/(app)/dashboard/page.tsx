import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Banknote,
  Car,
  Clock,
  HandCoins,
  PackageCheck,
  PiggyBank,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { PeriodFilter } from '@/components/shared/period-filter'
import { MetricCard } from '@/components/shared/metric-card'
import { Money } from '@/components/shared/money'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { ChartCard } from '@/components/charts/chart-shell'
import { SalesTrendChart } from '@/components/charts/sales-trend-chart'
import { WaterfallChart } from '@/components/charts/waterfall-chart'
import { Card, CardTitle } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { getDataDashboard } from '@/lib/queries/dashboard'
import { getCurrentRole } from '@/lib/dev-role'
import { resolvePeriode } from '@/lib/periode'
import { formatTanggal } from '@/lib/format'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { periode?: string; from?: string; to?: string }
}) {
  const role = await getCurrentRole()
  if (role === 'investor') redirect('/investor')

  const rentang = resolvePeriode(searchParams)
  const { data, error } = await getDataDashboard(rentang)
  const r = data.ringkasan

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Ringkasan performa bisnis — ${rentang.label.toLowerCase()}.`}
        action={<PeriodFilter />}
      />

      {error ? (
        <div className="mm-card mb-5">
          <ErrorState description={error} />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Jumlah Investor"
          value={r.jumlahInvestor}
          icon={Users}
          subtext="Investor aktif"
        />
        <MetricCard
          label="Total Investasi"
          value={r.totalInvestasi}
          format="money"
          icon={PiggyBank}
          subtext="Akumulasi akad aktif"
        />
        <MetricCard
          label="Total Saldo"
          value={r.totalSaldo}
          format="money"
          icon={Wallet}
          subtext="Dana idle, siap dipakai beli unit"
        />
        <MetricCard
          label="Total Unit Terjual"
          value={r.totalUnitTerjual}
          icon={TrendingUp}
          delta={r.delta.unitTerjual}
          tone="success"
        />
        <MetricCard
          label="Unit Available"
          value={r.totalUnitAvailable}
          icon={PackageCheck}
          subtext="Siap dijual sekarang"
        />
        <MetricCard
          label="Modal di Stok"
          value={r.totalModalAvailable}
          format="money"
          icon={Car}
          tone="warning"
          subtext="Modal tertanam di unit belum laku"
        />
        <MetricCard
          label="Total Laba Bersih"
          value={r.totalLabaBersih}
          format="money"
          icon={HandCoins}
          delta={r.delta.labaBersih}
          tone={r.totalLabaBersih < 0 ? 'danger' : 'success'}
        />
        <MetricCard
          label="Bagi Hasil Dibayarkan"
          value={r.totalBagiHasil}
          format="money"
          icon={Banknote}
          delta={r.delta.bagiHasil}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard
          title="Trend Penjualan Unit"
          description="Batang = jumlah unit terjual, garis = nilai penjualan."
          footnote={ringkasTrend(data.trend)}
        >
          {data.trend.length === 0 ? (
            <EmptyState
              title="Belum ada penjualan di periode ini"
              description="Coba pilih rentang periode yang lebih panjang."
              className="py-10"
            />
          ) : (
            <SalesTrendChart data={data.trend} />
          )}
        </ChartCard>

        <ChartCard
          title="Waterfall Laba Rugi"
          description="Dari pendapatan sampai laba yang jadi hak pengelola."
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href={`/laporan/laba-rugi?periode=${rentang.preset}`}>Laporan lengkap</Link>
            </Button>
          }
          footnote="Biaya operasional mencakup biaya kantor plus biaya lain-lain saat penjualan."
        >
          {data.waterfall.length === 0 || data.labaRugi.pendapatan === 0 ? (
            <EmptyState
              title="Belum ada data laba rugi"
              description="Data muncul setelah ada unit yang terjual di periode ini."
              className="py-10"
            />
          ) : (
            <WaterfallChart data={data.waterfall} />
          )}
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-3">5 Unit Terlama di Stok</CardTitle>
          {data.stokTerlama.length === 0 ? (
            <EmptyState
              icon={PackageCheck}
              title="Stok kosong"
              description="Semua unit sudah laku, atau belum ada pembelian."
              className="py-8"
            />
          ) : (
            <ul className="divide-y divide-line">
              {data.stokTerlama.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/master/mobil/${s.id}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-accent"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{s.unit}</p>
                      <p className="text-label text-ink-muted">{s.no_polisi ?? '-'}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Money value={s.hpp} className="block" />
                      <span
                        className={
                          s.umur > 60
                            ? 'text-label font-medium tnum text-danger'
                            : 'text-label tnum text-ink-muted'
                        }
                      >
                        <Clock className="mr-1 inline size-3" />
                        {s.umur} hari
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle className="mb-3">5 Penjualan Terakhir</CardTitle>
          {data.penjualanTerakhir.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Belum ada penjualan"
              description="Penjualan terbaru akan muncul di sini."
              className="py-8"
            />
          ) : (
            <ul className="divide-y divide-line">
              {data.penjualanTerakhir.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/master/mobil/${s.car_id}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-accent"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{s.unit}</p>
                      <p className="text-label text-ink-muted">{formatTanggal(s.tanggal)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Money value={s.harga} className="block" />
                      <Money value={s.laba} colored className="text-label" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

function ringkasTrend(trend: { bulan: string; unit: number; nilai: number }[]) {
  const totalUnit = trend.reduce((s, t) => s + t.unit, 0)
  if (totalUnit === 0) return 'Belum ada unit terjual di periode ini.'
  const totalNilai = trend.reduce((s, t) => s + t.nilai, 0)
  return `Total ${totalUnit} unit terjual dengan nilai penjualan ${new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(totalNilai)} di periode ini.`
}
