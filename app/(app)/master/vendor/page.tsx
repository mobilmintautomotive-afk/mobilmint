import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { MasterCrud } from '@/components/master/master-crud'
import { getDaftarVendor } from '@/lib/queries/master'
import { canWrite } from '@/lib/dev-role'
import { simpanVendor, hapusVendor } from '@/app/actions/master'
import { VENDOR_TYPE, VENDOR_TYPE_LABEL } from '@/lib/constants'

export const metadata: Metadata = { title: 'Master Vendor' }

const opsiTipe = VENDOR_TYPE.map((t) => ({ value: t, label: VENDOR_TYPE_LABEL[t] }))

export default async function VendorPage() {
  const { data, error } = await getDaftarVendor()
  const bolehTulis = await canWrite()

  return (
    <>
      <PageHeader
        title="Vendor"
        description="Bengkel, salon, dan penyedia spare part untuk perbaikan unit."
        breadcrumb={[{ label: 'Master' }, { label: 'Vendor' }]}
      />

      <MasterCrud
        entitas="Vendor"
        exportName="vendor"
        rows={data}
        error={error}
        canWrite={bolehTulis}
        searchKeys={['nama', 'alamat', 'no_tlp']}
        filter={{ key: 'tipe_vendor', label: 'Tipe', options: opsiTipe }}
        columns={[
          { key: 'nama', header: 'Nama' },
          { key: 'tipe_vendor', header: 'Tipe', kind: 'label', labelMap: VENDOR_TYPE_LABEL },
          { key: 'alamat', header: 'Alamat' },
          { key: 'no_tlp', header: 'No. Telepon' },
          { key: 'jumlah_perbaikan', header: 'Perbaikan', kind: 'number' },
          { key: 'total_biaya', header: 'Total Biaya', kind: 'money' },
          { key: 'is_active', header: 'Status', kind: 'aktif', align: 'center' },
        ]}
        fields={[
          { name: 'nama', label: 'Nama Vendor', kind: 'text', required: true, placeholder: 'Contoh: Bengkel Jaya Motor' },
          { name: 'tipe_vendor', label: 'Tipe Vendor', kind: 'select', required: true, options: opsiTipe },
          { name: 'no_tlp', label: 'No. Telepon', kind: 'tel', placeholder: '08xxxxxxxxxx' },
          { name: 'alamat', label: 'Alamat', kind: 'text' },
          { name: 'catatan', label: 'Catatan', kind: 'textarea', fullWidth: true },
          { name: 'is_active', label: 'Vendor aktif', kind: 'switch', fullWidth: true },
        ]}
        simpanAction={simpanVendor}
        hapusAction={hapusVendor}
        emptyTitle="Belum ada vendor"
        emptyDescription="Daftarkan bengkel dan salon langganan supaya input perbaikan lebih cepat."
      />
    </>
  )
}
