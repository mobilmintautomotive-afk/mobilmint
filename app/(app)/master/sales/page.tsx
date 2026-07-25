import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { MasterCrud } from '@/components/master/master-crud'
import { getDaftarSales } from '@/lib/queries/master'
import { canWrite } from '@/lib/dev-role'
import { simpanSales, hapusSales } from '@/app/actions/master'

export const metadata: Metadata = { title: 'Master Sales' }

export default async function SalesPage() {
  const { data, error } = await getDaftarSales()
  const bolehTulis = await canWrite()

  return (
    <>
      <PageHeader
        title="Sales"
        description="Tim penjualan beserta komisi standarnya."
        breadcrumb={[{ label: 'Master' }, { label: 'Sales' }]}
      />

      <MasterCrud
        entitas="Sales"
        exportName="sales"
        rows={data}
        error={error}
        canWrite={bolehTulis}
        searchKeys={['nama', 'alamat', 'no_tlp']}
        columns={[
          { key: 'nama', header: 'Nama' },
          { key: 'alamat', header: 'Alamat' },
          { key: 'no_tlp', header: 'No. Telepon' },
          { key: 'komisi_default', header: 'Komisi Default', kind: 'money' },
          { key: 'total_unit', header: 'Unit Terjual', kind: 'number' },
          { key: 'total_komisi', header: 'Total Komisi', kind: 'money' },
          { key: 'is_active', header: 'Status', kind: 'aktif', align: 'center' },
        ]}
        fields={[
          { name: 'nama', label: 'Nama Sales', kind: 'text', required: true },
          { name: 'no_tlp', label: 'No. Telepon', kind: 'tel', placeholder: '08xxxxxxxxxx' },
          { name: 'alamat', label: 'Alamat', kind: 'text', fullWidth: true },
          {
            name: 'komisi_default',
            label: 'Komisi Default',
            kind: 'money',
            hint: 'Terisi otomatis saat input penjualan, tetap bisa diubah per transaksi',
          },
          { name: 'is_active', label: 'Sales aktif', kind: 'switch', fullWidth: true },
        ]}
        simpanAction={simpanSales}
        hapusAction={hapusSales}
        emptyTitle="Belum ada sales"
        emptyDescription="Tambahkan sales supaya komisi bisa dihitung otomatis saat unit terjual."
      />
    </>
  )
}
