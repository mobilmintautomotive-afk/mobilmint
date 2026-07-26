import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { KasClient } from '@/components/transaksi/kas-client'
import { getAkunBank, getHakPengelola, getMutasiKas } from '@/lib/queries/bank'
import { canWrite, getCurrentRole } from '@/lib/dev-role'

export const metadata: Metadata = { title: 'Kas & Bank' }

export default async function KasPage() {
  const role = await getCurrentRole()
  if (role === 'investor') redirect('/investor')

  const [akun, mutasi, hak, bolehTulis] = await Promise.all([
    getAkunBank(),
    getMutasiKas(),
    getHakPengelola(),
    canWrite(),
  ])

  return (
    <>
      <PageHeader
        title="Kas & Bank"
        description="Semua arus uang perusahaan. Mutasi dari pembelian, penjualan, dan biaya tercatat otomatis — yang diinput manual hanya setor modal, pencairan hak pengelola, dan transfer antar rekening."
        breadcrumb={[{ label: 'Kas & Bank' }]}
      />

      <KasClient
        akun={akun.data}
        mutasi={mutasi.data}
        hak={hak.data}
        error={akun.error ?? mutasi.error ?? hak.error}
        canWrite={bolehTulis}
      />
    </>
  )
}
