import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Boxes, Car, HandCoins, TrendingUp, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EntitasSelector } from '@/components/laporan/entitas-selector'
import { MetricCard } from '@/components/shared/metric-card'
import { Money } from '@/components/shared/money'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { ChartCard } from '@/components/charts/chart-shell'
import { SalesTrendChart } from '@/components/charts/sales-trend-chart'
import { WaterfallChart } from '@/components/charts/waterfall-chart'
import { LedgerTable } from '@/components/shared/ledger-table'
import { UnitDidanaiTable } from '@/components/investor/unit-didanai-table'
import { Card, CardTitle, InfoHint, Separator, TooltipProvider } from '@/components/ui/primitives'
import { getNeracaPengelola } from '@/lib/queries/neraca'
import { getDashboardInvestor } from '@/lib/queries/investor'
import { getInvestorRingkas } from '@/lib/queries/master'
import { getCurrentRole } from '@/lib/dev-role'
import { formatTanggal } from '@/lib/format'

export const metadata: Metadata = { title: 'Neraca' }

export default async function NeracaPage({
  searchParams,
}: {
  searchParams: { entitas?: string }
}) {
  const role = await getCurrentRole()
  if (role === 'investor') redirect('/investor')

  const investors = await getInvestorRingkas()
  const entitas = searchParams.entitas || 'pengelola'

  return (
    <TooltipProvider>
      <PageHeader
        title="Neraca"
        description="Laporan keuangan per entitas — pengelola dan investor dipisah, tidak digabung jadi satu pool. Untuk pemantauan internal, bukan laporan bersertifikasi akuntan/pajak."
        breadcrumb={[{ label: 'Laporan' }, { label: 'Neraca' }]}
      />

      <div className="mb-5">
        <EntitasSelector investors={investors} aktif={entitas} />
      </div>

      {entitas === 'pengelola' ? <NeracaPengelolaView /> : <NeracaInvestorView investorId={entitas} />}
    </TooltipProvider>
  )
}

/* ------------------------------ Pengelola ------------------------------ */

async function NeracaPengelolaView() {
  const { data, error } = await getNeracaPengelola()

  if (error) {
    return (
      <div className="mm-card">
        <ErrorState description={error} />
      </div>
    )
  }

  return (
    <>
      <div className="mb-5 rounded-lg bg-accent-soft p-4 text-label text-accent">
        <strong>Cara baca:</strong> Begitu bagi hasil diproses, porsi pengelola pada dasarnya
        langsung ditarik ke rekening pribadi — tidak ada kas yang tertahan di pool. Karena itu
        Neraca Pengelola hanya berisi Aset Tetap perusahaan. Untuk laba rugi periode berjalan,
        lihat{' '}
        <Link href="/laporan/laba-rugi" className="underline">
          Laporan Laba Rugi
        </Link>{' '}
        — baris &ldquo;Laba Bersih Pengelola&rdquo; di sana sudah tepat.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Aset Tetap (Nilai Buku)"
          value={data.asetTetapNilaiBuku}
          format="money"
          icon={Boxes}
          subtext={`${data.rincianAset.length} aset tercatat`}
        />
        <MetricCard
          label="Total Porsi Pengelola (Realized)"
          value={data.porsiPengelolaRealized}
          format="money"
          icon={HandCoins}
          tone="success"
          subtext="Sejak awal, dari semua bagi hasil"
        />
        <MetricCard
          label="Estimasi Laba Ditahan"
          value={data.estimasiLabaDitahanKalauTidakDitarik}
          format="money"
          icon={Wallet}
          subtext="Kalau semua profit TIDAK ditarik — bukan saldo riil"
          action={
            <InfoHint>
              Angka informasi saja: porsi pengelola dikurangi biaya operasional dan pembelian
              aset, seandainya tidak pernah ditarik. Dalam praktiknya biasanya langsung ditarik,
              jadi ini bukan saldo kas yang benar-benar ada.
            </InfoHint>
          }
        />
      </div>

      <Card className="mt-5">
        <CardTitle className="mb-4">Neraca Pengelola per {formatTanggal(data.perTanggal || new Date())}</CardTitle>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mm-label-caps mb-2">Aset</p>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-body text-ink">Aset Tetap (Nilai Buku)</span>
              <Money value={data.asetTetapNilaiBuku} />
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between py-1">
              <span className="font-semibold text-ink">Total Aset</span>
              <Money value={data.asetTetapNilaiBuku} size="lg" className="font-semibold" />
            </div>
          </div>
          <div>
            <p className="mm-label-caps mb-2">Modal</p>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-body text-ink">Modal Ditanamkan ke Aset Tetap</span>
              <Money value={data.modalPengelola} />
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between py-1">
              <span className="font-semibold text-ink">Total Modal</span>
              <Money value={data.modalPengelola} size="lg" className="font-semibold" />
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-5">
        <h2 className="mb-3 text-card-title text-ink">Rincian Aset Tetap</h2>
        {data.rincianAset.length === 0 ? (
          <div className="mm-card">
            <EmptyState
              icon={Boxes}
              title="Belum ada aset tetap"
              description="Tambahkan aset perusahaan di menu Transaksi > Aset Perusahaan."
              className="py-8"
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-surface shadow">
            <div className="mm-scroll overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-alt">
                  <tr>
                    <th className="px-4 py-3 text-left text-caps uppercase text-ink-subtle">Nama</th>
                    <th className="px-4 py-3 text-left text-caps uppercase text-ink-subtle">Kategori</th>
                    <th className="px-4 py-3 text-left text-caps uppercase text-ink-subtle">Tanggal Beli</th>
                    <th className="px-4 py-3 text-right text-caps uppercase text-ink-subtle">Harga Beli</th>
                    <th className="px-4 py-3 text-right text-caps uppercase text-ink-subtle">Penyusutan</th>
                    <th className="px-4 py-3 text-right text-caps uppercase text-ink-subtle">Nilai Buku</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rincianAset.map((a) => (
                    <tr key={a.id} className="border-t border-line">
                      <td className="px-4 py-2.5 text-body text-ink">{a.nama}</td>
                      <td className="px-4 py-2.5 text-label text-ink-muted">{a.kategori}</td>
                      <td className="px-4 py-2.5 text-body text-ink-muted">
                        {formatTanggal(a.tanggal_beli)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Money value={a.harga_beli} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Money value={-a.akumulasi_penyusutan} className="text-ink-muted" />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Money value={a.nilai_buku} className="font-medium" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* ------------------------------- Investor ------------------------------- */

async function NeracaInvestorView({ investorId }: { investorId: string }) {
  const { data, error } = await getDashboardInvestor(investorId)

  if (error) {
    return (
      <div className="mm-card">
        <ErrorState description={error} />
      </div>
    )
  }

  if (!data.nama) {
    return (
      <div className="mm-card">
        <EmptyState title="Investor tidak ditemukan" />
      </div>
    )
  }

  return (
    <>
      <div className="mb-5 rounded-lg bg-accent-soft p-4 text-label text-accent">
        <strong>Cara baca:</strong> Neraca investor selalu balance — semua yang tercatat memang
        100% milik investor ini sendiri, tidak ada pihak lain yang punya klaim.
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <h2 className="text-page-title text-ink">{data.nama}</h2>
        {data.golongan ? (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-medium text-accent">
            {data.golongan}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Saldo" value={data.saldo} format="money" icon={Wallet} />
        <MetricCard
          label="Total Unit Terjual"
          value={data.unitTerjual}
          icon={TrendingUp}
          tone="success"
        />
        <MetricCard
          label="Total Bagi Hasil Diterima"
          value={data.totalBagiHasil}
          format="money"
          icon={HandCoins}
          tone="success"
        />
        <MetricCard
          label="Modal Sedang Berjalan"
          value={data.modalBerjalan}
          format="money"
          icon={Car}
          tone="warning"
          subtext={`Ada di ${data.unitBerjalan} unit mobil`}
        />
      </div>

      <Card className="mt-5">
        <CardTitle className="mb-4">Neraca — {data.nama}</CardTitle>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mm-label-caps mb-2">Aset</p>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-body text-ink">Saldo (Kas)</span>
              <Money value={data.saldo} />
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-body text-ink">Modal Berjalan (Tertanam di Unit)</span>
              <Money value={data.modalBerjalan} />
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between py-1">
              <span className="font-semibold text-ink">Total Aset</span>
              <Money value={data.saldo + data.modalBerjalan} size="lg" className="font-semibold" />
            </div>
          </div>
          <div>
            <p className="mm-label-caps mb-2">Modal</p>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-body text-ink">Modal Milik {data.nama}</span>
              <Money value={data.saldo + data.modalBerjalan} />
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between py-1">
              <span className="font-semibold text-ink">Total Modal</span>
              <Money value={data.saldo + data.modalBerjalan} size="lg" className="font-semibold" />
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard
          title="Laba Rugi — Bagi Hasil Diterima"
          description="Unit yang didanai dan sudah laku, beserta bagi hasilnya per bulan."
        >
          {data.trend.length === 0 ? (
            <EmptyState
              title="Belum ada unit yang laku"
              description="Grafik muncul setelah mobil yang didanai investor ini terjual."
              className="py-10"
            />
          ) : (
            <SalesTrendChart data={data.trend} labelBar="Unit Laku" labelLine="Bagi Hasil" />
          )}
        </ChartCard>

        <ChartCard title="Perjalanan Modal" description="Dari modal awal sampai saldo sekarang.">
          <WaterfallChart data={data.waterfall} height={280} />
        </ChartCard>
      </div>

      <div className="mt-5">
        <h2 className="mb-3 text-card-title text-ink">Unit yang Didanai</h2>
        <UnitDidanaiTable rows={data.unitDidanai} />
      </div>

      <div className="mt-5">
        <h2 className="mb-3 text-card-title text-ink">Mutasi Saldo</h2>
        <LedgerTable rows={data.ledger} exportName={`mutasi-${data.nama.toLowerCase().replace(/\s+/g, '-')}`} />
      </div>
    </>
  )
}
