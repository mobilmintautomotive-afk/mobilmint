import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { MobilTable } from '@/components/master/mobil-table'
import { getDaftarMobil } from '@/lib/queries/master'
import { canWrite } from '@/lib/dev-role'

export const metadata: Metadata = { title: 'Master Mobil' }

export default async function MobilPage() {
  const { data, error } = await getDaftarMobil()
  const bolehTulis = await canWrite()

  return (
    <>
      <PageHeader
        title="Mobil"
        description="Katalog seluruh unit beserta status dan HPP-nya. Unit baru ditambahkan lewat Transaksi > Pembelian, bukan di sini."
        breadcrumb={[{ label: 'Stock Unit' }, { label: 'Mobil' }]}
      />
      <MobilTable rows={data} error={error} canWrite={bolehTulis} />
    </>
  )
}
