import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Users, Wrench } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Money } from '@/components/shared/money'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { Card, CardTitle, Separator } from '@/components/ui/primitives'
import { TimelineStatus } from '@/components/master/timeline-status'
import { GaleriFoto } from '@/components/master/galeri-foto'
import { AksiUnit } from '@/components/master/aksi-unit'
import { getDetailMobil } from '@/lib/queries/master'
import { canWrite } from '@/lib/dev-role'
import { formatAngka, formatPersen, formatTanggal, umurHari } from '@/lib/format'
import { PAYMENT_METHOD_LABEL, TRANSMISI_LABEL, VENDOR_TYPE_LABEL } from '@/lib/constants'

export const metadata: Metadata = { title: 'Detail Unit' }

export default async function DetailMobilPage({ params }: { params: { id: string } }) {
  const { data, error } = await getDetailMobil(params.id)
  const bolehTulis = await canWrite()

  if (error) {
    return (
      <>
        <PageHeader title="Detail Unit" breadcrumb={[{ label: 'Stock Unit' }, { label: 'Mobil', href: '/master/mobil' }]} />
        <div className="mm-card">
          <ErrorState description={error} />
        </div>
      </>
    )
  }
  if (!data.car) notFound()

  const car = data.car
  const judul = `${car.merek} ${car.tipe} ${car.tahun}`
  const umur = car.tanggal_beli ? umurHari(car.tanggal_beli) : null
  const totalFunding = data.fundings.reduce((s: number, f: any) => s + Number(f.amount), 0)

  return (
    <>
      <PageHeader
        title={judul}
        description={`${car.no_polisi ?? 'Tanpa no. polisi'} · ${TRANSMISI_LABEL[car.transmisi ?? ''] ?? 'Transmisi -'} · ${formatAngka(car.kilometer ?? 0)} km`}
        breadcrumb={[
          { label: 'Master' },
          { label: 'Mobil', href: '/master/mobil' },
          { label: judul },
        ]}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={car.status} />
            {bolehTulis ? <AksiUnit car={car} /> : null}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardTitle className="mb-3">Foto Unit</CardTitle>
            <GaleriFoto urls={car.foto_urls ?? []} alt={judul} />
          </Card>

          <Card>
            <CardTitle className="mb-4">Perjalanan Unit</CardTitle>
            <TimelineStatus
              status={car.status}
              tanggalBeli={car.tanggal_beli}
              tanggalPerbaikanMulai={data.repairs[0]?.tanggal_masuk ?? null}
              tanggalReady={
                data.repairs.length > 0
                  ? (data.repairs[data.repairs.length - 1]?.tanggal_selesai ?? null)
                  : car.tanggal_beli
              }
              tanggalJual={car.tanggal_jual}
              tanggalSelesai={data.profitSharing?.tanggal_proses ?? null}
            />
            {umur !== null && ['DIBELI', 'PERBAIKAN', 'READY_STOCK'].includes(car.status) ? (
              <p className="mt-4 text-label text-ink-muted">
                Unit ini sudah{' '}
                <span className={umur > 60 ? 'font-medium text-danger' : 'font-medium text-ink'}>
                  {umur} hari
                </span>{' '}
                di stok terhitung sejak tanggal pembelian.
              </p>
            ) : null}
          </Card>

          <Card>
            <CardTitle className="mb-4">Rincian HPP</CardTitle>
            <div className="space-y-2.5">
              <BarisHpp label="Harga beli" value={data.purchase?.harga_beli ?? 0} />
              {(data.purchase?.rincian_biaya_lain ?? []).map((b: any, i: number) => (
                <BarisHpp key={i} label={b.nama} value={b.nominal} sub />
              ))}
              {data.repairs.map((r: any) => (
                <BarisHpp
                  key={r.id}
                  label={`Perbaikan ${r.jenis_perbaikan}${r.vendors?.nama ? ` — ${r.vendors.nama}` : ''}`}
                  value={r.biaya}
                  sub
                />
              ))}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink">HPP Unit</span>
                <Money value={car.hpp} size="lg" />
              </div>
            </div>
          </Card>

          {data.sale ? (
            <Card>
              <CardTitle className="mb-4">Hasil Penjualan</CardTitle>
              <div className="space-y-2.5">
                <BarisHpp label="Harga jual" value={data.sale.harga_jual} />
                <BarisHpp label="HPP unit" value={-Number(data.sale.hpp_snapshot)} sub />
                <Separator />
                <BarisHpp label="Laba kotor" value={data.sale.laba_kotor} tebal />
                <BarisHpp label="Komisi sales" value={-Number(data.sale.komisi_sales)} sub />
                <BarisHpp label="Biaya lain" value={-Number(data.sale.biaya_lain)} sub />
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">
                    {Number(data.sale.laba_bersih) < 0 ? 'Rugi Bersih' : 'Laba Bersih'}
                  </span>
                  <Money value={data.sale.laba_bersih} size="lg" colored />
                </div>
              </div>
              <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
                <Info label="Customer" value={data.sale.customers?.nama ?? '-'} />
                <Info label="Salesman" value={data.sale.sales_persons?.nama ?? 'Tanpa salesman'} />
                <Info
                  label="Metode bayar"
                  value={PAYMENT_METHOD_LABEL[data.sale.metode_bayar as keyof typeof PAYMENT_METHOD_LABEL]}
                />
                <Info label="No. transaksi" value={data.sale.no_transaksi} />
                <Info label="Tanggal jual" value={formatTanggal(data.sale.tanggal_jual)} />
                <Info
                  label="Bagi hasil"
                  value={data.sale.is_profit_shared ? 'Sudah diproses' : 'Belum diproses'}
                />
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card>
            <CardTitle className="mb-3">Spesifikasi</CardTitle>
            <dl className="space-y-3">
              <Info label="Merek / Tipe" value={`${car.merek} ${car.tipe}`} />
              <Info label="Tahun" value={String(car.tahun)} />
              <Info label="Warna" value={car.warna ?? '-'} />
              <Info label="Transmisi" value={TRANSMISI_LABEL[car.transmisi ?? ''] ?? '-'} />
              <Info label="Kilometer" value={`${formatAngka(car.kilometer ?? 0)} km`} />
              <Info label="No. Rangka" value={car.no_rangka ?? '-'} />
              <Info label="No. Mesin" value={car.no_mesin ?? '-'} />
              <Info label="Masa Pajak" value={formatTanggal(car.tanggal_pajak)} />
              {car.catatan ? <Info label="Catatan" value={car.catatan} /> : null}
            </dl>
          </Card>

          <Card>
            <CardTitle className="mb-3">Pendana Unit Ini</CardTitle>
            {data.fundings.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Belum ada alokasi modal"
                description="Alokasi terbentuk saat transaksi pembelian disimpan."
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {data.fundings.map((f: any) => (
                  <Link
                    key={f.id}
                    href={`/master/investor/${f.investor_id}`}
                    className="flex items-center justify-between gap-3 rounded-[10px] border border-line p-3 transition-colors hover:bg-surface-alt"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{f.investors?.nama}</p>
                      <p className="text-label text-ink-muted">
                        Nisbah {formatPersen(f.nisbah_investor_pct)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Money value={f.amount} className="block font-medium" />
                      <span className="text-label tnum text-ink-muted">
                        {formatPersen(f.porsi_pct, 2)}
                      </span>
                    </div>
                  </Link>
                ))}
                <div className="flex items-center justify-between border-t border-line pt-3">
                  <span className="text-label font-medium text-ink">Total modal</span>
                  <Money value={totalFunding} className="font-semibold" />
                </div>
              </div>
            )}
          </Card>

          <Card>
            <CardTitle className="mb-3">Riwayat Perbaikan</CardTitle>
            {data.repairs.length === 0 ? (
              <EmptyState
                icon={Wrench}
                title="Belum ada perbaikan"
                description="Unit ini belum pernah masuk bengkel."
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {data.repairs.map((r: any) => (
                  <div key={r.id} className="rounded-[10px] border border-line p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{r.jenis_perbaikan}</p>
                        <p className="text-label text-ink-muted">
                          {r.vendors?.nama ?? 'Tanpa vendor'}
                          {r.vendors?.tipe_vendor
                            ? ` · ${VENDOR_TYPE_LABEL[r.vendors.tipe_vendor as keyof typeof VENDOR_TYPE_LABEL]}`
                            : ''}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    {r.deskripsi ? (
                      <p className="mt-2 text-label text-ink-muted">{r.deskripsi}</p>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between text-label">
                      <span className="text-ink-subtle">
                        {formatTanggal(r.tanggal_masuk)}
                        {r.tanggal_selesai ? ` – ${formatTanggal(r.tanggal_selesai)}` : ''}
                      </span>
                      <Money value={r.biaya} className="font-medium" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {data.profitSharing ? (
            <Card>
              <CardTitle className="mb-3">Bagi Hasil</CardTitle>
              <div className="space-y-2.5">
                <Info label="No. transaksi" value={data.profitSharing.no_transaksi} />
                <Info label="Tanggal proses" value={formatTanggal(data.profitSharing.tanggal_proses)} />
                <Separator />
                <BarisHpp label="Laba bersih" value={data.profitSharing.laba_bersih} tebal />
                <BarisHpp label="Porsi investor" value={data.profitSharing.porsi_investor} sub />
                <BarisHpp label="Porsi pengelola" value={data.profitSharing.porsi_pengelola} sub />
              </div>
              <div className="mt-4 space-y-2 border-t border-line pt-3">
                {(data.profitSharing.profit_sharing_details ?? []).map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between text-label">
                    <span className="min-w-0 truncate text-ink-muted">{d.investors?.nama}</span>
                    <Money value={d.total_kembali} className="font-medium text-ink" />
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  )
}

function BarisHpp({
  label,
  value,
  sub,
  tebal,
}: {
  label: string
  value: number
  sub?: boolean
  tebal?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={sub ? 'text-label text-ink-muted' : tebal ? 'font-medium text-ink' : 'text-body text-ink'}>
        {sub ? `— ${label}` : label}
      </span>
      <Money value={value} className={sub ? 'text-label text-ink-muted' : tebal ? 'font-medium' : ''} />
    </div>
  )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="mm-label-caps">{label}</dt>
      <dd className="mt-0.5 text-body text-ink">{value}</dd>
    </div>
  )
}
