import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { MasterCrud } from '@/components/master/master-crud'
import { getDaftarSupplier } from '@/lib/queries/master'
import { canWrite } from '@/lib/dev-role'
import { simpanSupplier, hapusSupplier } from '@/app/actions/master'
import { SUPPLIER_TYPE, SUPPLIER_TYPE_LABEL } from '@/lib/constants'

export const metadata: Metadata = { title: 'Master Supplier' }

const opsiTipe = SUPPLIER_TYPE.map((t) => ({ value: t, label: SUPPLIER_TYPE_LABEL[t] }))

export default async function SupplierPage() {
  const { data, error } = await getDaftarSupplier()
  const bolehTulis = await canWrite()

  return (
    <>
      <PageHeader
        title="Supplier"
        description="Sumber unit mobil: balai lelang, mediator, dan followers."
        breadcrumb={[{ label: 'Pembelian' }, { label: 'Supplier' }]}
      />

      <MasterCrud
        entitas="Supplier"
        exportName="supplier"
        rows={data}
        error={error}
        canWrite={bolehTulis}
        searchKeys={['nama', 'alamat', 'no_tlp']}
        filter={{ key: 'tipe_supplier', label: 'Tipe', options: opsiTipe }}
        columns={[
          { key: 'nama', header: 'Nama' },
          { key: 'tipe_supplier', header: 'Tipe', kind: 'label', labelMap: SUPPLIER_TYPE_LABEL },
          { key: 'alamat', header: 'Alamat' },
          { key: 'no_tlp', header: 'No. Telepon' },
          { key: 'jumlah_unit', header: 'Unit Dibeli', kind: 'number' },
          { key: 'total_nilai', header: 'Total Nilai', kind: 'money' },
          { key: 'is_active', header: 'Status', kind: 'aktif', align: 'center' },
        ]}
        fields={[
          { name: 'nama', label: 'Nama Supplier', kind: 'text', required: true, placeholder: 'Contoh: Balai Lelang JBA' },
          { name: 'tipe_supplier', label: 'Tipe Supplier', kind: 'select', required: true, options: opsiTipe, creatable: true },
          { name: 'no_tlp', label: 'No. Telepon', kind: 'tel', placeholder: '08xxxxxxxxxx' },
          { name: 'alamat', label: 'Alamat', kind: 'text' },
          { name: 'catatan', label: 'Catatan', kind: 'textarea', fullWidth: true },
          { name: 'is_active', label: 'Supplier aktif', kind: 'switch', hint: 'Nonaktifkan kalau sudah tidak dipakai', fullWidth: true },
        ]}
        simpanAction={simpanSupplier}
        hapusAction={hapusSupplier}
        emptyTitle="Belum ada supplier"
        emptyDescription="Tambahkan supplier tetap supaya saat input pembelian tinggal pilih dari dropdown."
      />
    </>
  )
}
