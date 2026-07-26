import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Landmark, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { MetricCard } from '@/components/shared/metric-card'
import { BankTable } from '@/components/master/bank-table'
import { getAkunBank } from '@/lib/queries/bank'
import { canWrite, getCurrentRole } from '@/lib/dev-role'

export const metadata: Metadata = { title: 'Akun Bank' }

export default async function BankPage() {
  const role = await getCurrentRole()
  if (role === 'investor') redirect('/investor')

  const [{ data: rows, error }, bolehTulis] = await Promise.all([getAkunBank(), canWrite()])

  const totalSaldo = rows.reduce((s, b) => s + b.saldo, 0)
  const aktif = rows.filter((b) => b.is_active).length

  return (
    <>
      <PageHeader
        title="Akun Bank"
        description="Rekening perusahaan beserta saldo terkini. Saldo dihitung dari saldo awal ditambah seluruh mutasi kas — tidak diinput manual."
        breadcrumb={[{ label: 'Kas & Bank' }, { label: 'Akun Bank' }]}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <MetricCard
          label="Total Saldo Kas"
          value={totalSaldo}
          format="money"
          icon={Wallet}
          subtext={`${aktif} rekening aktif`}
        />
        <MetricCard
          label="Jumlah Rekening"
          value={rows.length}
          icon={Landmark}
          subtext="Termasuk yang dinonaktifkan"
        />
      </div>

      <BankTable rows={rows} error={error} canWrite={bolehTulis} />
    </>
  )
}
