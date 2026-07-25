import type { Metadata } from 'next'
import { Layers, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { MetricCard } from '@/components/shared/metric-card'
import { AsetTable } from '@/components/transaksi/aset-table'
import { getDaftarAset } from '@/lib/queries/assets'
import { canWrite } from '@/lib/dev-role'

export const metadata: Metadata = { title: 'Aset Perusahaan' }

export default async function AsetPage() {
  const [{ data: rows, error }, bolehTulis] = await Promise.all([getDaftarAset(), canWrite()])

  const totalHargaBeli = rows.reduce((s, a) => s + a.harga_beli, 0)
  const totalNilaiBuku = rows.reduce((s, a) => s + a.nilai_buku, 0)

  return (
    <>
      <PageHeader
        title="Aset Perusahaan"
        description="Aset tetap milik pengelola (komputer, furnitur, kendaraan operasional, dll) — tidak memotong saldo investor, berbeda dari unit mobil dagangan."
        breadcrumb={[{ label: 'Transaksi' }, { label: 'Aset Perusahaan' }]}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <MetricCard
          label="Total Harga Perolehan"
          value={totalHargaBeli}
          format="money"
          icon={Wallet}
          subtext={`${rows.length} aset tercatat`}
        />
        <MetricCard
          label="Total Nilai Buku Saat Ini"
          value={totalNilaiBuku}
          format="money"
          icon={Layers}
          subtext="Setelah penyusutan"
        />
      </div>

      <AsetTable rows={rows} error={error} canWrite={bolehTulis} />
    </>
  )
}
