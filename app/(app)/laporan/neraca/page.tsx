import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Money } from '@/components/shared/money'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { Card, CardTitle, Separator } from '@/components/ui/primitives'
import { getDataNeraca } from '@/lib/queries/neraca'
import { getCurrentRole } from '@/lib/dev-role'
import { formatTanggal } from '@/lib/format'

export const metadata: Metadata = { title: 'Neraca' }

export default async function NeracaPage() {
  const role = await getCurrentRole()
  if (role === 'investor') redirect('/investor')

  const { data, error } = await getDataNeraca()

  return (
    <>
      <PageHeader
        title="Neraca"
        description={`Posisi keuangan pool per ${formatTanggal(data.perTanggal || new Date())} — dihitung real-time, bukan laporan resmi bersertifikasi akuntan.`}
        breadcrumb={[{ label: 'Laporan' }, { label: 'Neraca' }]}
      />

      {error ? (
        <div className="mm-card mb-5">
          <ErrorState description={error} />
        </div>
      ) : (
        <>
          <div className="mb-5 rounded-lg bg-accent-soft p-4 text-label text-accent">
            <strong>Cara baca:</strong> Investor mendanai jual-beli mobil, bukan aset kantor —
            karena itu ada baris terpisah untuk &ldquo;Kas Pengelola&rdquo; dan &ldquo;Aset
            Tetap&rdquo; yang murni milik pengelola. Laporan ini untuk pemantauan internal;
            review dengan akuntan sebelum dipakai untuk keperluan resmi/pajak.
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardTitle className="mb-4">Aset</CardTitle>
              <div className="space-y-1">
                <Baris label="Kas & Setara Kas (Saldo Investor)" value={data.aset.kasInvestorIdle} />
                <Baris
                  label="Kas Penjualan (Menunggu Bagi Hasil)"
                  value={data.aset.kasPenjualanPending}
                  hint="Sudah diterima dari customer, belum dibagi ke investor & pengelola"
                />
                <Baris
                  label="Modal Tertanam di Unit"
                  value={data.aset.modalDiUnit}
                  hint="HPP unit yang belum terjual"
                />
                <Baris
                  label="Kas Pengelola"
                  value={data.aset.kasPengelola}
                  colored
                  hint="Akumulasi laba pengelola, dikurangi biaya operasional & pembelian aset"
                />
                <Baris label="Aset Tetap (Nilai Buku)" value={data.aset.asetTetapNilaiBuku} />
                <Separator className="my-2" />
                <div className="flex items-center justify-between py-1">
                  <span className="font-semibold text-ink">Total Aset</span>
                  <Money value={data.aset.total} size="lg" className="font-semibold" />
                </div>
              </div>
            </Card>

            <Card>
              <CardTitle className="mb-4">Kewajiban &amp; Modal</CardTitle>
              <div className="space-y-1">
                <Baris
                  label="Kewajiban ke Investor"
                  value={data.kewajibanModal.kewajibanInvestor}
                  hint="Saldo idle + modal pokok yang masih tertanam di unit"
                />
                <Baris
                  label="Modal Pengelola"
                  value={data.kewajibanModal.modalPengelola}
                  colored
                  hint="Laba ditahan pengelola setelah biaya operasional & penyusutan aset"
                />
                <Baris
                  label="Laba Ditahan — Menunggu Bagi Hasil"
                  value={data.kewajibanModal.labaDitahanPending}
                  hint="Belum diformalkan jadi hak investor/pengelola"
                />
                <Baris
                  label="Klaim Perbaikan Belum Terealisasi"
                  value={data.kewajibanModal.klaimPerbaikanBelumRealisasi}
                  hint="Biaya perbaikan yang sudah dibayar pengelola, tertanam di unit yang belum selesai terjual"
                />
                <Separator className="my-2" />
                <div className="flex items-center justify-between py-1">
                  <span className="font-semibold text-ink">Total Kewajiban &amp; Modal</span>
                  <Money value={data.kewajibanModal.total} size="lg" className="font-semibold" />
                </div>
              </div>

              <div
                className={`mt-4 flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-label ${
                  data.selisih === 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
                }`}
              >
                {data.selisih === 0 ? (
                  <>
                    <CheckCircle2 className="size-4 shrink-0" />
                    Neraca balance — Aset = Kewajiban + Modal.
                  </>
                ) : (
                  <>
                    <AlertTriangle className="size-4 shrink-0" />
                    Selisih <Money value={data.selisih} className="font-medium" /> — ada data yang
                    tidak konsisten, cek kembali.
                  </>
                )}
              </div>
            </Card>
          </div>

          <div className="mt-5">
            <h2 className="mb-3 text-card-title text-ink">Rincian Aset Tetap</h2>
            {data.rincianAset.length === 0 ? (
              <div className="mm-card">
                <EmptyState
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
      )}
    </>
  )
}

function Baris({
  label,
  value,
  hint,
  colored,
}: {
  label: string
  value: number
  hint?: string
  colored?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-body text-ink">{label}</p>
        {hint ? <p className="mt-0.5 text-label text-ink-subtle">{hint}</p> : null}
      </div>
      <Money value={value} colored={colored} className="shrink-0" />
    </div>
  )
}
