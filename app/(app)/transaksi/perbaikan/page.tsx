import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { PerbaikanClient } from '@/components/transaksi/perbaikan-client'
import { getDaftarPerbaikan, getUnitBisaDiperbaiki } from '@/lib/queries/transaksi'
import { getOpsiDropdown } from '@/lib/queries/master'
import { canWrite } from '@/lib/dev-role'

export const metadata: Metadata = { title: 'Perbaikan Mobil' }

export default async function PerbaikanPage() {
  const [list, unit, opsi, bolehTulis] = await Promise.all([
    getDaftarPerbaikan(),
    getUnitBisaDiperbaiki(),
    getOpsiDropdown(),
    canWrite(),
  ])

  return (
    <>
      <PageHeader
        title="Perbaikan"
        description="Setiap biaya perbaikan langsung menambah HPP unit, supaya laba yang dihitung nanti realistis."
        breadcrumb={[{ label: 'Transaksi' }, { label: 'Perbaikan' }]}
      />
      <PerbaikanClient
        rows={list.data}
        error={list.error}
        canWrite={bolehTulis}
        units={unit.data.map((u) => ({
          id: u.id,
          label: `${u.merek} ${u.tipe} ${u.tahun}`,
          no_polisi: u.no_polisi,
          status: u.status,
          hpp: u.hpp,
        }))}
        vendors={opsi.data.vendors}
      />
    </>
  )
}
