import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { PembelianClient } from '@/components/transaksi/pembelian-client'
import { getDaftarPembelian, getUnitBelumDibeli } from '@/lib/queries/transaksi'
import { getOpsiDropdown, getSaldoInvestor } from '@/lib/queries/master'
import { canWrite } from '@/lib/dev-role'

export const metadata: Metadata = { title: 'Pembelian Mobil' }

export default async function PembelianPage() {
  const [list, unit, opsi, saldo, bolehTulis] = await Promise.all([
    getDaftarPembelian(),
    getUnitBelumDibeli(),
    getOpsiDropdown(),
    getSaldoInvestor(),
    canWrite(),
  ])

  return (
    <>
      <PageHeader
        title="Pembelian Mobil"
        description="Catat pembelian unit sekaligus alokasi modal investor yang membiayainya."
        breadcrumb={[{ label: 'Transaksi' }, { label: 'Pembelian' }]}
      />
      <PembelianClient
        rows={list.data}
        error={list.error}
        canWrite={bolehTulis}
        unitTersedia={unit.data}
        suppliers={opsi.data.suppliers}
        saldoInvestor={saldo.data}
      />
    </>
  )
}
