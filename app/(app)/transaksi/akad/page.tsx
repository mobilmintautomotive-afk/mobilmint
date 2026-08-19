import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { AkadClient } from '@/components/transaksi/akad-client'
import { getDaftarAkad } from '@/lib/queries/transaksi'
import { getOpsiDropdown } from '@/lib/queries/master'
import { getPengaturan } from '@/lib/queries/settings'
import { canWrite } from '@/lib/dev-role'

export const metadata: Metadata = { title: 'Akad Investor' }

export default async function AkadPage() {
  const [{ data, error }, opsi, setting, bolehTulis] = await Promise.all([
    getDaftarAkad(),
    getOpsiDropdown(),
    getPengaturan(),
    canWrite(),
  ])

  return (
    <>
      <PageHeader
        title="Akad Investor"
        description="Kesepakatan investasi. Saldo investor baru bertambah setelah dana dikonfirmasi masuk rekening."
        breadcrumb={[{ label: 'Investasi' }, { label: 'Akad Investor' }]}
      />
      <AkadClient
        rows={data}
        error={error}
        canWrite={bolehTulis}
        investors={opsi.data.investors}
        defaultNisbahPengelola={setting.data.default_nisbah_pengelola}
      />
    </>
  )
}
