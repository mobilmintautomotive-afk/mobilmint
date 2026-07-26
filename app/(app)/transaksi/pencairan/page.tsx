import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { PencairanClient } from '@/components/transaksi/pencairan-client'
import { getPencairanDana } from '@/lib/queries/transaksi'
import { canWrite } from '@/lib/dev-role'

export const metadata: Metadata = { title: 'Pencairan Dana' }

export default async function PencairanPage() {
  const [{ data, error }, bolehTulis] = await Promise.all([getPencairanDana(), canWrite()])

  return (
    <>
      <PageHeader
        title="Pencairan Dana"
        description="Bagi hasil diproses otomatis saat penjualan disimpan. Halaman ini untuk mencatat transfer riilnya ke rekening investor."
        breadcrumb={[{ label: 'Kas & Bank' }, { label: 'Pencairan Dana' }]}
      />
      <PencairanClient rows={data} error={error} canWrite={bolehTulis} />
    </>
  )
}
