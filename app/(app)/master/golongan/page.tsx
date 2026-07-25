import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { MasterCrud } from '@/components/master/master-crud'
import { getDaftarGolongan } from '@/lib/queries/master'
import { canWrite } from '@/lib/dev-role'
import { simpanGolongan, hapusGolongan } from '@/app/actions/master'

export const metadata: Metadata = { title: 'Golongan Investasi' }

export default async function GolonganPage() {
  const { data, error } = await getDaftarGolongan()
  const bolehTulis = await canWrite()

  return (
    <>
      <PageHeader
        title="Golongan Investasi"
        description="Paket investasi: nilai setoran dan porsi bagi hasil antara investor dan pengelola."
        breadcrumb={[{ label: 'Master' }, { label: 'Golongan Investasi' }]}
      />

      <MasterCrud
        entitas="Golongan"
        exportName="golongan-investasi"
        rows={data}
        error={error}
        canWrite={bolehTulis}
        searchKeys={['nama_golongan', 'deskripsi']}
        columns={[
          { key: 'nama_golongan', header: 'Nama Golongan' },
          { key: 'nilai_investasi', header: 'Nilai Investasi', kind: 'money' },
          { key: 'nisbah_investor_pct', header: 'Nisbah Investor', kind: 'percent' },
          { key: 'nisbah_pengelola_pct', header: 'Nisbah Pengelola', kind: 'percent' },
          { key: 'tenor_bulan', header: 'Tenor (bulan)', kind: 'number' },
          { key: 'jumlah_investor', header: 'Investor Aktif', kind: 'number' },
          { key: 'is_active', header: 'Status', kind: 'aktif', align: 'center' },
        ]}
        fields={[
          { name: 'nama_golongan', label: 'Nama Golongan', kind: 'text', required: true, placeholder: 'Contoh: Gold' },
          { name: 'nilai_investasi', label: 'Nilai Investasi', kind: 'money', required: true },
          {
            name: 'nisbah_investor_pct',
            label: 'Nisbah Investor (%)',
            kind: 'percent',
            required: true,
            placeholder: '65',
            hint: 'Porsi laba bersih yang jadi hak investor',
          },
          {
            name: 'nisbah_pengelola_pct',
            label: 'Nisbah Pengelola (%)',
            kind: 'percent',
            komplemenDari: 'nisbah_investor_pct',
          },
          { name: 'tenor_bulan', label: 'Tenor (bulan)', kind: 'number', placeholder: '12' },
          { name: 'deskripsi', label: 'Deskripsi', kind: 'textarea', fullWidth: true },
          { name: 'is_active', label: 'Golongan aktif', kind: 'switch', fullWidth: true },
        ]}
        simpanAction={simpanGolongan}
        hapusAction={hapusGolongan}
        emptyTitle="Belum ada golongan investasi"
        emptyDescription="Buat minimal satu golongan dulu — nilainya dipakai otomatis saat membuat akad investor."
      />
    </>
  )
}
