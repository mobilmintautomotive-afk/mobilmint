import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Banknote, Boxes, Car, HandCoins, TrendingUp, Wallet } from 'lucide-react'
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
import { formatRupiah, formatTanggal } from '@/lib/format'

export const metadata: Metadata = { title: 'Neraca' }

const formatRp = (n: number) => formatRupiah(n)

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
        <strong>Cara baca:</strong> Ini posisi uang pengelola saja, terpisah dari dana investor.
        Kas di sini bukan saldo rekening bank — satu rekening menampung uang investor dan pengelola
        sekaligus, jadi yang ditampilkan hanya bagian yang benar-benar hak pengelola. Untuk laba
        rugi periode berjalan, lihat{' '}
        <Link href="/laporan/laba-rugi" className="underline">
          Laporan Laba Rugi
        </Link>
        .
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Kas Pengelola"
          value={data.kasPengelola}
          format="money"
          icon={Wallet}
          tone={data.kasPengelola < 0 ? 'danger' : 'default'}
          subtext="Hak yang belum ditarik"
          action={
            <InfoHint>
              Modal disetor ditambah porsi bagi hasil, dikurangi biaya operasional, pembelian aset,
              dan yang sudah dicairkan ke rekening pribadi.
            </InfoHint>
          }
        />
        <MetricCard
          label="Aset Tetap (Nilai Buku)"
          value={data.asetTetapNilaiBuku}
          format="money"
          icon={Boxes}
          subtext={`${data.rincianAset.length} aset tercatat`}
        />
        <MetricCard
          label="Porsi Bagi Hasil"
          value={data.porsiBagiHasil}
          format="money"
          icon={HandCoins}
          tone="success"
          subtext="Sejak awal, dari semua unit terjual"
        />
        <MetricCard
          label="Sudah Dicairkan (Prive)"
          value={data.prive}
          format="money"
          icon={Banknote}
          subtext="Ditarik ke rekening pribadi"
        />
      </div>

      <Card className="mt-5">
        <CardTitle className="mb-4">
          Neraca Pengelola per {formatTanggal(data.perTanggal || new Date())}
        </CardTitle>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mm-label-caps mb-2">Aset</p>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-body text-ink">Kas Pengelola</span>
              <Money value={data.kasPengelola} colored />
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-body text-ink">Aset Tetap (Nilai Buku)</span>
              <Money value={data.asetTetapNilaiBuku} />
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between py-1">
              <span className="font-semibold text-ink">Total Aset</span>
              <Money value={data.totalAset} size="lg" className="font-semibold" />
            </div>
          </div>
          <div>
            <p className="mm-label-caps mb-2">Modal</p>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-body text-ink">Modal Disetor</span>
              <Money value={data.modalDisetor} />
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-body text-ink">Laba Ditahan</span>
              <Money value={data.labaDitahan} colored />
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-body text-ink">Prive (Pencairan)</span>
              <Money value={-data.prive} colored />
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between py-1">
              <span className="font-semibold text-ink">Total Modal</span>
              <Money value={data.totalModal} size="lg" className="font-semibold" />
            </div>
          </div>
        </div>

        <p className="mt-4 rounded-lg bg-surface-alt p-3 text-label text-ink-muted">
          Laba ditahan = porsi bagi hasil {formatRp(data.porsiBagiHasil)} − biaya operasional{' '}
          {formatRp(data.totalOpex)} − penyusutan aset {formatRp(data.akumulasiPenyusutan)}.
        </p>
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
