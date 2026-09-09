import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Wrench } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Money } from '@/components/shared/money'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { Card, CardTitle, Separator } from '@/components/ui/primitives'
import { TimelineStatus } from '@/components/master/timeline-status'
import { GaleriFoto } from '@/components/master/galeri-foto'
import { getDetailUnitInvestor } from '@/lib/queries/investor'
import { getCurrentInvestorId } from '@/lib/dev-role'
import { formatAngka, formatPersen, formatTanggal, umurHari } from '@/lib/format'
import { TRANSMISI_LABEL } from '@/lib/constants'

export const metadata: Metadata = { title: 'Detail Unit' }

export default async function DetailUnitInvestorPage({ params }: { params: { id: string } }) {
  const investorId = await getCurrentInvestorId()
  if (!investorId) notFound()

  const { data, error } = await getDetailUnitInvestor(params.id, investorId)

  if (error) {
    return (
      <>
        <PageHeader title="Detail Unit" breadcrumb={[{ label: 'Unit Saya', href: '/investor/unit' }]} />
        <div className="mm-card">
          <ErrorState description={error} />
        </div>
      </>
    )
  }

  // Bukan pendana unit ini (atau unit tidak ada) -- jangan pernah tampilkan
  // apa pun, termasuk lewat tebak-tebak ID di URL.
  if (!data.funding || !data.car) notFound()

  const car = data.car
  const judul = `${car.merek} ${car.tipe} ${car.tahun}`
  const umur = car.tanggal_beli ? umurHari(car.tanggal_beli) : null

  return (
    <>
      <PageHeader
        title={judul}
        description={`${car.no_polisi ?? 'Tanpa no. polisi'} · ${TRANSMISI_LABEL[car.transmisi ?? ''] ?? 'Transmisi -'} · ${formatAngka(car.kilometer ?? 0)} km`}
        breadcrumb={[{ label: 'Unit Saya', href: '/investor/unit' }, { label: judul }]}
        action={<StatusBadge status={car.status} />}
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
              tanggalBooking={data.booking?.tanggal_booking ?? null}
              tanggalJual={car.tanggal_jual}
              tanggalSelesai={data.profitSharingDetail?.tanggal_proses ?? null}
            />
            {umur !== null && ['DIBELI', 'PERBAIKAN', 'READY_STOCK', 'TERBOOKING'].includes(car.status) ? (
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
              {data.repairs.map((r) => (
                <BarisHpp
                  key={r.id}
                  label={`Perbaikan ${r.jenis_perbaikan}${r.vendor_nama ? ` — ${r.vendor_nama}` : ''}`}
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

          {data.booking && car.status === 'TERBOOKING' ? (
            <Card>
              <CardTitle className="mb-4">Booking Aktif</CardTitle>
              <div className="space-y-2.5">
                <BarisHpp label="Harga sepakat" value={data.booking.harga_sepakat} />
                <BarisHpp label="DP diterima" value={data.booking.dp_amount} sub />
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">Sisa pelunasan</span>
                  <Money value={data.booking.harga_sepakat - data.booking.dp_amount} size="lg" />
                </div>
              </div>
              <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                <Info label="No. booking" value={data.booking.no_booking} />
                <Info label="Tanggal booking" value={formatTanggal(data.booking.tanggal_booking)} />
              </div>
            </Card>
          ) : null}

          {data.sale ? (
            <Card>
              <CardTitle className="mb-4">Hasil Penjualan</CardTitle>
              <div className="space-y-2.5">
                <BarisHpp label="Harga jual" value={data.sale.harga_jual} />
                <BarisHpp label="HPP unit" value={-data.sale.hpp_snapshot} sub />
                <Separator />
                <BarisHpp label="Laba kotor" value={data.sale.laba_kotor} tebal />
                <BarisHpp label="Komisi sales" value={-data.sale.komisi_sales} sub />
                <BarisHpp label="Biaya lain" value={-data.sale.biaya_lain} sub />
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">
                    {data.sale.laba_bersih < 0 ? 'Rugi Bersih' : 'Laba Bersih'}
                  </span>
                  <Money value={data.sale.laba_bersih} size="lg" colored />
                </div>
              </div>
              <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                <Info label="No. transaksi" value={data.sale.no_transaksi} />
                <Info label="Tanggal jual" value={formatTanggal(data.sale.tanggal_jual)} />
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
            </dl>
          </Card>

          <Card>
            <CardTitle className="mb-3">Pendanaan Anda</CardTitle>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-label text-ink-muted">Porsi modal Anda</span>
                <Money value={data.funding.amount} className="font-semibold" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-label text-ink-muted">Persentase dari unit</span>
                <span className="tnum font-medium text-ink">
                  {formatPersen(data.funding.porsi_pct, 2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-label text-ink-muted">Nisbah Anda</span>
                <span className="tnum font-medium text-ink">
                  {formatPersen(data.funding.nisbah_investor_pct)}
                </span>
              </div>
            </div>
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
                {data.repairs.map((r) => (
                  <div key={r.id} className="rounded-[10px] border border-line p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{r.jenis_perbaikan}</p>
                        <p className="text-label text-ink-muted">{r.vendor_nama ?? 'Tanpa vendor'}</p>
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

          {data.profitSharingDetail ? (
            <Card>
              <CardTitle className="mb-3">Bagi Hasil Anda</CardTitle>
              <div className="space-y-2.5">
                <Info label="Tanggal proses" value={formatTanggal(data.profitSharingDetail.tanggal_proses)} />
                <Separator />
                <BarisHpp label="Modal awal" value={data.profitSharingDetail.modal_awal} sub />
                <BarisHpp label="Modal kembali" value={data.profitSharingDetail.modal_kembali} sub />
                <BarisHpp label="Bagi hasil" value={data.profitSharingDetail.bagi_hasil} sub />
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">Total kembali</span>
                  <Money value={data.profitSharingDetail.total_kembali} size="lg" colored />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-label text-ink-muted">Status transfer</span>
                  <span
                    className={
                      data.profitSharingDetail.sudah_ditransfer
                        ? 'text-label font-medium text-success'
                        : 'text-label font-medium text-warning-deep'
                    }
                  >
                    {data.profitSharingDetail.sudah_ditransfer ? 'Sudah ditransfer' : 'Belum ditransfer'}
                  </span>
                </div>
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
