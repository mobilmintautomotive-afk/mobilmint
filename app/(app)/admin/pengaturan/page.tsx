import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { PengaturanForm } from '@/components/admin/pengaturan-form'
import { getPengaturan } from '@/lib/queries/settings'
import { getCurrentRole } from '@/lib/dev-role'

export const metadata: Metadata = { title: 'Pengaturan' }

export default async function PengaturanPage() {
  const role = await getCurrentRole()
  if (role !== 'admin') redirect(role === 'investor' ? '/investor' : '/dashboard')

  const { data, error } = await getPengaturan()

  return (
    <>
      <PageHeader
        title="Pengaturan"
        description="Profil perusahaan untuk kop laporan, nisbah default, dan ambang peringatan umur stok."
        breadcrumb={[{ label: 'Pengaturan' }, { label: 'Umum' }]}
      />
      <PengaturanForm setting={data} error={error} />
    </>
  )
}
