import type { Metadata } from 'next'
import { Boxes, Clock, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { MetricCard } from '@/components/shared/metric-card'
import { StockClient } from '@/components/transaksi/stock-client'
import { getReadyStock } from '@/lib/queries/transaksi'
import { getPengaturan } from '@/lib/queries/settings'
import { canWrite } from '@/lib/dev-role'

export const metadata: Metadata = { title: 'Ready Stock' }

export default async function StockPage() {
  const [{ data, error }, setting, bolehTulis] = await Promise.all([
    getReadyStock(),
    getPengaturan(),
    canWrite(),
  ])

  const totalModal = data.reduce((s, c) => s + c.hpp, 0)
  const umurList = data.map((c) => c.umur_stok_hari ?? 0)
  const rataUmur = umurList.length > 0 ? Math.round(umurList.reduce((s, u) => s + u, 0) / umurList.length) : 0
  const ambang = setting.data.ambang_umur_stok

  return (
    <>
      <PageHeader
        title="Ready Stock"
        description="Unit yang siap dijual. Perhatikan unit yang sudah terlalu lama di stok."
        breadcrumb={[{ label: 'Transaksi' }, { label: 'Stock' }]}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total Unit Ready" value={data.length} icon={Boxes} subtext="Siap dijual" />
        <MetricCard
          label="Nilai Modal Tertanam"
          value={totalModal}
          format="money"
          icon={Wallet}
          subtext="Akumulasi HPP unit ready"
        />
        <MetricCard
          label="Rata-rata Umur Stok"
          value={`${rataUmur} hari`}
          format="text"
          icon={Clock}
          tone={rataUmur > ambang ? 'danger' : 'default'}
          subtext={`Ambang peringatan ${ambang} hari`}
        />
      </div>

      <StockClient rows={data} error={error} ambangUmur={ambang} canWrite={bolehTulis} />
    </>
  )
}
