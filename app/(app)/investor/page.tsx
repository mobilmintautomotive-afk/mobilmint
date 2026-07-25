import type { Metadata } from 'next'
import Link from 'next/link'
import { Car, HandCoins, TrendingUp, Wallet } from 'lucide-react'
import { MetricCard } from '@/components/shared/metric-card'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { ChartCard } from '@/components/charts/chart-shell'
import { SalesTrendChart } from '@/components/charts/sales-trend-chart'
import { WaterfallChart } from '@/components/charts/waterfall-chart'
import { LedgerTable } from '@/components/shared/ledger-table'
import { UnitDidanaiTable } from '@/components/investor/unit-didanai-table'
import { TombolLaporanInvestor } from '@/components/investor/tombol-laporan'
import { InfoHint, TooltipProvider } from '@/components/ui/primitives'
import { getDashboardInvestor } from '@/lib/queries/investor'
import { getCurrentInvestorId } from '@/lib/dev-role'
import { formatRupiah } from '@/lib/format'

export const metadata: Metadata = { title: 'Dashboard Saya' }

export default async function DashboardInvestorPage() {
  const investorId = await getCurrentInvestorId()

  if (!investorId) {
    return (
      <div className="mm-card">
        <EmptyState
          icon={Wallet}
          title="Belum ada investor yang dipilih"
          description="Gunakan tombol role di pojok kanan atas untuk memilih investor yang ingin dilihat. Setelah login aktif, halaman ini otomatis menampilkan data akun Anda sendiri."
        />
      </div>
    )
  }

  const { data, error } = await getDashboardInvestor(investorId)

  if (error) {
    return (
      <div className="mm-card">
        <ErrorState description={error} />
      </div>
    )
  }

  if (!data.punyaAkadAktif && data.ledger.length === 0) {
    return (
      <div className="mm-card">
        <EmptyState
          icon={Wallet}
          title="Akad Anda sedang diproses"
          description="Data akan muncul di sini setelah dana dikonfirmasi oleh pengelola."
        />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-page-title text-ink">Halo, {data.nama}</h1>
            {data.golongan ? (
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-medium text-accent">
                {data.golongan}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-label text-ink-muted">
            Ini ringkasan uang Anda di MobilMint. Semua angka diperbarui otomatis.
          </p>
        </div>
        <TombolLaporanInvestor nama={data.nama} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Saldo Anda"
          value={data.saldo}
          format="money"
          icon={Wallet}
          hero
          subtext="Dana yang siap diputar kembali"
        />
        <MetricCard
          label="Total Unit Terjual"
          value={data.unitTerjual}
          icon={TrendingUp}
          tone="success"
          subtext="Dari dana Anda"
        />
        <MetricCard
          label="Total Bagi Hasil Diterima"
          value={data.totalBagiHasil}
          format="money"
          icon={HandCoins}
          tone="success"
          subtext="Sejak awal bergabung"
        />
        <MetricCard
          label="Modal Sedang Berjalan"
          value={data.modalBerjalan}
          format="money"
          icon={Car}
          tone="warning"
          subtext={`Ada di ${data.unitBerjalan} unit mobil`}
          action={
            <InfoHint>
              Uang Anda yang sekarang dipakai untuk membeli mobil dan belum kembali ke saldo. Uang
              ini akan kembali otomatis begitu mobilnya laku terjual.
            </InfoHint>
          }
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard
          title="Trend Penjualan"
          description="Unit yang Anda danai dan sudah laku, beserta bagi hasilnya."
          footnote={kalimatTrend(data.trend)}
        >
          {data.trend.length === 0 ? (
            <EmptyState
              title="Belum ada unit yang laku"
              description="Grafik muncul setelah mobil yang Anda danai terjual."
              className="py-10"
            />
          ) : (
            <SalesTrendChart data={data.trend} labelBar="Unit Laku" labelLine="Bagi Hasil" />
          )}
        </ChartCard>

        <ChartCard
          title="Perjalanan Uang Anda"
          description="Dari modal awal sampai saldo sekarang."
          footnote={`Modal awal ${formatRupiah(data.totalInvestasi)}, ditambah bagi hasil ${formatRupiah(
            data.totalBagiHasil,
          )}${data.totalPenarikan > 0 ? `, dikurangi penarikan ${formatRupiah(data.totalPenarikan)}` : ''}, jadi saldo Anda sekarang ${formatRupiah(data.saldo)}.`}
        >
          <WaterfallChart data={data.waterfall} height={280} />
        </ChartCard>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-card-title text-ink">Unit yang Anda Danai</h2>
          <Link href="/investor/unit" className="text-label text-accent hover:underline">
            Lihat semua
          </Link>
        </div>
        <UnitDidanaiTable rows={data.unitDidanai.slice(0, 10)} />
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-card-title text-ink">Mutasi Saldo</h2>
          <Link href="/investor/mutasi" className="text-label text-accent hover:underline">
            Lihat semua
          </Link>
        </div>
        <LedgerTable rows={data.ledger} exportName="mutasi-saldo-saya" />
      </div>
    </TooltipProvider>
  )
}

function kalimatTrend(trend: { bulan: string; unit: number; nilai: number }[]) {
  if (trend.length === 0) return 'Belum ada mobil yang Anda danai terjual.'
  const terakhir = trend[trend.length - 1]
  return `${terakhir.bulan}: ${terakhir.unit} unit yang Anda danai terjual dengan bagi hasil ${formatRupiah(
    terakhir.nilai,
  )}.`
}
