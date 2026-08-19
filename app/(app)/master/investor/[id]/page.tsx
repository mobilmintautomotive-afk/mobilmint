import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Banknote, Car, Handshake, PiggyBank, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { MetricCard } from '@/components/shared/metric-card'
import { Money } from '@/components/shared/money'
import { StatusBadge } from '@/components/shared/status-badge'
import { LedgerTable } from '@/components/shared/ledger-table'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { Card, CardTitle, Separator } from '@/components/ui/primitives'
import { PenarikanDialog } from '@/components/master/penarikan-dialog'
import { getDetailInvestor } from '@/lib/queries/master'
import { canWrite } from '@/lib/dev-role'
import { formatPersen, formatTanggal } from '@/lib/format'

export const metadata: Metadata = { title: 'Detail Investor' }

export default async function DetailInvestorPage({ params }: { params: { id: string } }) {
  const { data, error } = await getDetailInvestor(params.id)
  const bolehTulis = await canWrite()

  if (error) {
    return (
      <>
        <PageHeader title="Detail Investor" breadcrumb={[{ label: 'Investasi' }, { label: 'Investor', href: '/master/investor' }]} />
        <div className="mm-card">
          <ErrorState description={error} />
        </div>
      </>
    )
  }
  if (!data.investor) notFound()

  const inv = data.investor
  const saldo = data.saldo

  return (
    <>
      <PageHeader
        title={inv.nama}
        description={[inv.no_tlp, inv.email].filter(Boolean).join(' · ') || 'Tanpa kontak'}
        breadcrumb={[
          { label: 'Master' },
          { label: 'Investor', href: '/master/investor' },
          { label: inv.nama },
        ]}
        action={
          bolehTulis && saldo ? (
            <PenarikanDialog investorId={inv.id} namaInvestor={inv.nama} saldo={saldo.saldo} />
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Saldo Saat Ini"
          value={saldo?.saldo ?? 0}
          format="money"
          icon={Wallet}
          subtext="Dana yang siap diputar kembali"
        />
        <MetricCard
          label="Total Investasi"
          value={saldo?.total_investasi ?? 0}
          format="money"
          icon={PiggyBank}
          subtext="Akumulasi setoran"
        />
        <MetricCard
          label="Modal Berjalan"
          value={saldo?.modal_berjalan ?? 0}
          format="money"
          icon={Car}
          tone="warning"
          subtext={`Tertanam di ${data.fundings.filter((f: any) => f.cars?.status !== 'SELESAI').length} unit`}
        />
        <MetricCard
          label="Total Bagi Hasil"
          value={saldo?.total_bagi_hasil ?? 0}
          format="money"
          icon={Banknote}
          tone="success"
          subtext="Sejak awal bergabung"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardTitle className="mb-3">Profil</CardTitle>
          <dl className="space-y-3">
            <Baris label="Alamat" value={inv.alamat} />
            <Baris label="No. KTP" value={inv.no_ktp} />
            <Separator />
            <Baris label="Bank" value={inv.nama_bank} />
            <Baris label="No. Rekening" value={inv.no_rekening} />
            <Baris label="Atas Nama" value={inv.atas_nama_rekening} />
            <Separator />
            <Baris label="Catatan" value={inv.catatan} />
            <Baris label="Status" value={inv.is_active ? 'Aktif' : 'Nonaktif'} />
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle className="mb-3">Akad Investasi</CardTitle>
          {data.kontrak.length === 0 ? (
            <EmptyState
              icon={Handshake}
              title="Belum ada akad"
              description="Buat akad di menu Transaksi > Akad Investor."
              className="py-8"
            />
          ) : (
            <div className="mm-scroll overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="pb-2 text-left text-caps uppercase text-ink-subtle">No. Akad</th>
                    <th className="pb-2 text-right text-caps uppercase text-ink-subtle">Nilai</th>
                    <th className="pb-2 text-right text-caps uppercase text-ink-subtle">Nisbah</th>
                    <th className="pb-2 text-left text-caps uppercase text-ink-subtle">Tanggal</th>
                    <th className="pb-2 text-center text-caps uppercase text-ink-subtle">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.kontrak.map((k: any) => (
                    <tr key={k.id} className="border-b border-line last:border-0">
                      <td className="py-3 text-body tnum text-ink">{k.no_akad}</td>
                      <td className="py-3 text-right">
                        {k.nilai_investasi === null ? (
                          <span className="text-ink-subtle">Tanpa batas</span>
                        ) : (
                          <Money value={k.nilai_investasi} />
                        )}
                      </td>
                      <td className="py-3 text-right tnum text-ink-muted">
                        {formatPersen(k.nisbah_investor_pct)}
                      </td>
                      <td className="py-3 text-body text-ink-muted">
                        {formatTanggal(k.tanggal_akad)}
                      </td>
                      <td className="py-3 text-center">
                        <StatusBadge status={k.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-5">
        <h2 className="mb-3 text-card-title text-ink">Unit yang Didanai</h2>
        {data.fundings.length === 0 ? (
          <div className="mm-card">
            <EmptyState
              icon={Car}
              title="Dana belum terpakai di unit manapun"
              description="Saat ada pembelian mobil, porsi modal investor ini akan muncul di sini."
              className="py-8"
            />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.fundings.map((f: any) => (
              <Link
                key={f.id}
                href={`/master/mobil/${f.car_id}`}
                className="mm-card transition-shadow hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      {f.cars?.merek} {f.cars?.tipe} {f.cars?.tahun}
                    </p>
                    <p className="text-label text-ink-muted">{f.cars?.no_polisi ?? '-'}</p>
                  </div>
                  {f.cars?.status ? <StatusBadge status={f.cars.status} /> : null}
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="mm-label-caps">Porsi modal</p>
                    <Money value={f.amount} size="lg" className="mt-0.5 block" />
                  </div>
                  <span className="text-label tnum text-ink-muted">
                    {formatPersen(f.porsi_pct, 2)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5">
        <h2 className="mb-3 text-card-title text-ink">Mutasi Saldo</h2>
        <LedgerTable rows={data.ledger} exportName={`mutasi-${inv.nama.toLowerCase().replace(/\s+/g, '-')}`} />
      </div>
    </>
  )
}

function Baris({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="mm-label-caps">{label}</dt>
      <dd className="mt-0.5 text-body text-ink">{value || <span className="text-ink-subtle">-</span>}</dd>
    </div>
  )
}
