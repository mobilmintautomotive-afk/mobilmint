import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { MasterCrud } from '@/components/master/master-crud'
import { getDaftarInvestor } from '@/lib/queries/master'
import { canWrite } from '@/lib/dev-role'
import { simpanInvestor, hapusInvestor } from '@/app/actions/master'

export const metadata: Metadata = { title: 'Master Investor' }

export default async function InvestorPage() {
  const { data, error } = await getDaftarInvestor()
  const bolehTulis = await canWrite()

  return (
    <>
      <PageHeader
        title="Investor"
        description="Data pemodal beserta saldo terkini. Total investasi dan saldo dihitung otomatis dari akad & mutasi — tidak diinput manual."
        breadcrumb={[{ label: 'Investasi' }, { label: 'Investor' }]}
      />

      <MasterCrud
        entitas="Investor"
        exportName="master-investor"
        rows={data}
        error={error}
        canWrite={bolehTulis}
        searchKeys={['nama', 'no_tlp', 'email', 'alamat']}
        detailBasePath="/master/investor"
        columns={[
          { key: 'nama', header: 'Nama' },
          { key: 'no_tlp', header: 'No. Telepon' },
          { key: 'email', header: 'Email' },
          { key: 'nisbah_aktif', header: 'Nisbah Aktif', kind: 'percent' },
          { key: 'total_investasi', header: 'Total Investasi', kind: 'money' },
          { key: 'saldo', header: 'Saldo Saat Ini', kind: 'money' },
          { key: 'is_active', header: 'Status', kind: 'aktif', align: 'center' },
        ]}
        fields={[
          { name: 'nama', label: 'Nama Investor', kind: 'text', required: true },
          { name: 'no_tlp', label: 'No. Telepon', kind: 'tel', placeholder: '08xxxxxxxxxx' },
          { name: 'email', label: 'Email', kind: 'email', placeholder: 'nama@email.com' },
          { name: 'no_ktp', label: 'No. KTP', kind: 'text', hint: 'Opsional' },
          { name: 'alamat', label: 'Alamat', kind: 'textarea', fullWidth: true },
          {
            name: 'nama_bank',
            label: 'Nama Bank',
            kind: 'text',
            placeholder: 'BCA',
            hint: 'Dipakai saat transfer bagi hasil',
          },
          { name: 'no_rekening', label: 'No. Rekening', kind: 'text' },
          { name: 'atas_nama_rekening', label: 'Atas Nama Rekening', kind: 'text', fullWidth: true },
          { name: 'catatan', label: 'Catatan', kind: 'textarea', fullWidth: true },
          { name: 'is_active', label: 'Investor aktif', kind: 'switch', fullWidth: true },
        ]}
        simpanAction={simpanInvestor}
        hapusAction={hapusInvestor}
        emptyTitle="Belum ada investor"
        emptyDescription="Daftarkan investor dulu, lalu buat akad pertamanya di menu Transaksi > Akad Investor."
      />
    </>
  )
}
