import type { Metadata } from 'next'
import { Wallet } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { MetricCard } from '@/components/shared/metric-card'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { LedgerTable } from '@/components/shared/ledger-table'
import { TombolLaporanInvestor } from '@/components/investor/tombol-laporan'
import { getDashboardInvestor } from '@/lib/queries/investor'
import { getCurrentInvestorId } from '@/lib/dev-role'

export const metadata: Metadata = { title: 'Mutasi Saldo' }

export default async function MutasiSayaPage() {
  const investorId = await getCurrentInvestorId()

  if (!investorId) {
    return (
      <div className="mm-card">
        <EmptyState
          icon={Wallet}
          title="Belum ada investor yang dipilih"
          description="Gunakan tombol role di pojok kanan atas untuk memilih investor."
        />
      </div>
    )
  }

  const { data, error } = await getDashboardInvestor(investorId)

  return (
    <>
      <PageHeader
        title="Mutasi Saldo"
        description="Setiap rupiah yang masuk dan keluar dari saldo Anda, lengkap dengan penjelasannya."
        action={<TombolLaporanInvestor nama={data.nama} />}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Saldo Anda" value={data.saldo} format="money" icon={Wallet} />
        <MetricCard
          label="Total Masuk"
          value={data.totalInvestasi + data.totalBagiHasil}
          format="money"
          tone="success"
          subtext="Setoran + bagi hasil"
        />
        <MetricCard
          label="Total Penarikan"
          value={data.totalPenarikan}
          format="money"
          tone="warning"
          subtext="Dana yang sudah Anda tarik"
        />
      </div>

      {error ? (
        <div className="mm-card">
          <ErrorState description={error} />
        </div>
      ) : (
        <LedgerTable rows={data.ledger} exportName="mutasi-saldo-saya" />
      )}
    </>
  )
}
