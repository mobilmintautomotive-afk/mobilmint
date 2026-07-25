import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { MasterCrud } from '@/components/master/master-crud'
import { getDaftarCustomer } from '@/lib/queries/master'
import { canWrite } from '@/lib/dev-role'
import { simpanCustomer, hapusCustomer } from '@/app/actions/master'

export const metadata: Metadata = { title: 'Master Customer' }

export default async function CustomerPage() {
  const { data, error } = await getDaftarCustomer()
  const bolehTulis = await canWrite()

  return (
    <>
      <PageHeader
        title="Customer"
        description="Pembeli unit mobil."
        breadcrumb={[{ label: 'Master' }, { label: 'Customer' }]}
      />

      <MasterCrud
        entitas="Customer"
        exportName="customer"
        rows={data}
        error={error}
        canWrite={bolehTulis}
        searchKeys={['nama', 'alamat', 'no_tlp']}
        columns={[
          { key: 'nama', header: 'Nama' },
          { key: 'alamat', header: 'Alamat' },
          { key: 'no_tlp', header: 'No. Telepon' },
          { key: 'jumlah_pembelian', header: 'Jumlah Pembelian', kind: 'number' },
        ]}
        fields={[
          { name: 'nama', label: 'Nama Customer', kind: 'text', required: true },
          { name: 'no_tlp', label: 'No. Telepon', kind: 'tel', placeholder: '08xxxxxxxxxx' },
          { name: 'alamat', label: 'Alamat', kind: 'text', fullWidth: true },
          { name: 'no_ktp', label: 'No. KTP', kind: 'text', hint: 'Opsional' },
          { name: 'catatan', label: 'Catatan', kind: 'textarea', fullWidth: true },
        ]}
        simpanAction={simpanCustomer}
        hapusAction={hapusCustomer}
        emptyTitle="Belum ada customer"
        emptyDescription="Customer bisa ditambahkan di sini atau langsung dari form penjualan."
      />
    </>
  )
}
