import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { BagiHasilClient } from '@/components/transaksi/bagi-hasil-client'
import { getMenungguBagiHasil, getRiwayatBagiHasil } from '@/lib/queries/transaksi'
import { canWrite } from '@/lib/dev-role'

export const metadata: Metadata = { title: 'Bagi Hasil' }

export default async function BagiHasilPage() {
  const [menunggu, riwayat, bolehTulis] = await Promise.all([
    getMenungguBagiHasil(),
    getRiwayatBagiHasil(),
    canWrite(),
  ])

  return (
    <>
      <PageHeader
        title="Bagi Hasil"
        description="Mengembalikan modal investor sekaligus membagikan keuntungan. Cek simulasinya dulu sebelum diproses."
        breadcrumb={[{ label: 'Transaksi' }, { label: 'Bagi Hasil' }]}
      />
      <BagiHasilClient
        menunggu={menunggu.data}
        riwayat={riwayat.data}
        error={menunggu.error ?? riwayat.error}
        canWrite={bolehTulis}
      />
    </>
  )
}
