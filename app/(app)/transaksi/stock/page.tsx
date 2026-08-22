import type { Metadata } from 'next'
import { Boxes, Clock, PackageCheck, PiggyBank, ShoppingCart, Wallet, Wrench } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { MetricCard } from '@/components/shared/metric-card'
import { StockClient } from '@/components/transaksi/stock-client'
import { getStockUnit } from '@/lib/queries/transaksi'
import { getPengaturan } from '@/lib/queries/settings'
import { canWrite } from '@/lib/dev-role'

export const metadata: Metadata = { title: 'Stock Unit' }

export default async function StockPage() {
  const [{ data, error }, setting, bolehTulis] = await Promise.all([
    getStockUnit(),
    getPengaturan(),
    canWrite(),
  ])

  const jumlah = (status: string) => data.filter((c) => c.status === status).length
  const ready = jumlah('READY_STOCK')
  const perbaikan = jumlah('PERBAIKAN')
  const dibeli = jumlah('DIBELI')
  const terbooking = jumlah('TERBOOKING')

  const totalModal = data.reduce((s, c) => s + c.hpp, 0)
  const umurList = data.map((c) => c.umur_stok_hari ?? 0)
  const rataUmur =
    umurList.length > 0 ? Math.round(umurList.reduce((s, u) => s + u, 0) / umurList.length) : 0
  const ambang = setting.data.ambang_umur_stok

  return (
    <>
      <PageHeader
        title="Stock Unit"
        description="Seluruh unit yang modalnya masih tertanam — baru dibeli, sedang diperbaiki, maupun siap dijual."
        breadcrumb={[{ label: 'Stock Unit' }, { label: 'Stock' }]}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Total Unit di Stok"
          value={data.length}
          icon={Boxes}
          subtext="Belum terjual"
        />
        <MetricCard
          label="Siap Dijual"
          value={ready}
          icon={PackageCheck}
          tone="success"
          subtext="Ready stock"
        />
        <MetricCard
          label="Proses Perbaikan"
          value={perbaikan}
          icon={Wrench}
          tone="warning"
          subtext="Masih di bengkel"
        />
        <MetricCard
          label="Baru Dibeli"
          value={dibeli}
          icon={ShoppingCart}
          subtext="Belum masuk perbaikan"
        />
        <MetricCard
          label="Terbooking"
          value={terbooking}
          icon={PiggyBank}
          tone="warning"
          subtext="DP masuk, menunggu pelunasan"
        />
        <MetricCard
          label="Nilai Modal Tertanam"
          value={totalModal}
          format="money"
          icon={Wallet}
          subtext="Akumulasi HPP seluruh unit di stok"
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
