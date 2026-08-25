import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { TitipJualClient } from '@/components/transaksi/titip-jual-client'
import { getDaftarTitipJual } from '@/lib/queries/transaksi'
import { canWrite } from '@/lib/dev-role'

export const metadata: Metadata = { title: 'Titip Jual' }

export default async function TitipJualPage() {
  const [rows, bolehTulis] = await Promise.all([getDaftarTitipJual(), canWrite()])

  return (
    <>
      <PageHeader
        title="Titip Jual"
        description="Unit titipan pihak luar — bukan milik MobilMint, tidak dibiayai modal investor. Jasa Konten: sekali fee, unit numpang 1 hari. Konsinyasi: unit ditahan sampai laku, untung dari selisih harga jual dan harga setor."
        breadcrumb={[{ label: 'Penjualan' }, { label: 'Titip Jual' }]}
      />
      <TitipJualClient rows={rows.data} error={rows.error} canWrite={bolehTulis} />
    </>
  )
}
