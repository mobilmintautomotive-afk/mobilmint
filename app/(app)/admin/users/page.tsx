import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { PenggunaClient } from '@/components/admin/pengguna-client'
import { getDaftarPengguna, getInvestorTanpaAkun } from '@/lib/queries/settings'
import { getCurrentRole } from '@/lib/dev-role'

export const metadata: Metadata = { title: 'Kelola Akses' }

export default async function KelolaAksesPage() {
  const role = await getCurrentRole()
  if (role !== 'admin') redirect(role === 'investor' ? '/investor' : '/dashboard')

  const [pengguna, investor] = await Promise.all([getDaftarPengguna(), getInvestorTanpaAkun()])

  return (
    <>
      <PageHeader
        title="Kelola Akses"
        description="Daftarkan akun, tentukan role, dan hubungkan akun investor ke data investornya."
        breadcrumb={[{ label: 'Pengaturan' }, { label: 'Kelola Akses' }]}
      />

      <PenggunaClient rows={pengguna.data} error={pengguna.error} investors={investor.data} />
    </>
  )
}
