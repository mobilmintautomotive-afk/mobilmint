'use client'

import * as React from 'react'
import { AlertTriangle, CheckCircle2, RotateCcw, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Money } from '@/components/shared/money'
import { Button } from '@/components/ui/button'
import { MoneyInput } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/select'
import { Switch } from '@/components/ui/primitives'
import { formatPersen, formatRupiah } from '@/lib/format'
import { hitungAlokasiProporsional, validasiAlokasi } from '@/lib/calc'
import type { InvestorPendanaan } from '@/lib/queries/master'

export type BarisPendana = {
  investor_id: string
  nama: string
  saldo: number
  amount: number
}

/**
 * Panel "Sumber Dana" — mekanisme urun dana:
 * 1. Pilih Investor Utama (bebas, investor manapun yang punya saldo).
 * 2. Kalau saldonya kurang, klik "+ Tambah Investor" — pilihan yang muncul
 *    HANYA investor dengan nisbah yang SAMA PERSIS dengan investor utama,
 *    supaya satu unit selalu punya satu angka nisbah yang jelas pemiliknya.
 * 3. Kalau lebih dari 1 investor, alokasi default proporsional terhadap
 *    saldo, dengan opsi "Atur manual".
 */
export function UrunDanaPanel({
  totalModal,
  daftarInvestor,
  rows,
  onChange,
}: {
  totalModal: number
  daftarInvestor: InvestorPendanaan[]
  rows: BarisPendana[]
  onChange: (rows: BarisPendana[]) => void
}) {
  const [manual, setManual] = React.useState(false)

  const utama = rows[0]
  const investorUtamaData = utama
    ? daftarInvestor.find((i) => i.investor_id === utama.investor_id)
    : undefined
  const nisbahUtama = investorUtamaData?.nisbah_investor_pct ?? null

  const idTerpilih = new Set(rows.map((r) => r.investor_id))
  const kandidatTambahan = daftarInvestor.filter(
    (i) =>
      i.saldo > 0 &&
      !idTerpilih.has(i.investor_id) &&
      nisbahUtama !== null &&
      i.nisbah_investor_pct === nisbahUtama,
  )

  const totalSaldoTerpilih = rows.reduce((s, r) => s + r.saldo, 0)
  const cukup = totalSaldoTerpilih >= totalModal
  const validasi = validasiAlokasi(totalModal, rows)

  function hitungUlangProporsional(daftar: BarisPendana[]) {
    if (daftar.length <= 1) {
      return daftar.map((r) => ({ ...r, amount: totalModal }))
    }
    const hasil = hitungAlokasiProporsional(
      totalModal,
      daftar.map((r) => ({ investor_id: r.investor_id, nama: r.nama, saldo: r.saldo })),
    )
    return daftar.map((r) => ({
      ...r,
      amount: hasil.find((h) => h.investor_id === r.investor_id)?.amount ?? 0,
    }))
  }

  // Selama mode otomatis, alokasi selalu mengikuti total modal & daftar terbaru.
  React.useEffect(() => {
    if (manual || rows.length === 0) return
    onChange(hitungUlangProporsional(rows))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manual, totalModal, rows.length])

  function pilihUtama(investorId: string) {
    const inv = daftarInvestor.find((i) => i.investor_id === investorId)
    if (!inv) return
    setManual(false)
    onChange([{ investor_id: inv.investor_id, nama: inv.nama, saldo: inv.saldo, amount: totalModal }])
  }

  function tambahInvestor(investorId: string) {
    const inv = daftarInvestor.find((i) => i.investor_id === investorId)
    if (!inv) return
    const baru = [...rows, { investor_id: inv.investor_id, nama: inv.nama, saldo: inv.saldo, amount: 0 }]
    onChange(manual ? baru : hitungUlangProporsional(baru))
  }

  function hapusInvestor(investorId: string) {
    if (rows.length <= 1) return
    const sisa = rows.filter((r) => r.investor_id !== investorId)
    onChange(manual ? sisa : hitungUlangProporsional(sisa))
  }

  const bisaUrunan = utama !== undefined

  return (
    <section className="rounded-lg border border-line bg-surface-alt p-4">
      <header className="mb-3">
        <h4 className="text-card-title text-ink">Sumber Dana</h4>
        <p className="text-label text-ink-muted">
          Pilih investor utama dulu. Kalau saldonya kurang, tambahkan investor lain dengan
          nisbah yang sama untuk urun dana.
        </p>
      </header>

      <div className="space-y-1.5">
        <span className="block text-label font-medium text-ink">Investor Utama</span>
        <SearchableSelect
          options={daftarInvestor
            .filter((i) => i.saldo > 0)
            .map((i) => ({
              value: i.investor_id,
              label: i.nama,
              keterangan: `${i.golongan ?? 'Tanpa golongan'} · nisbah ${
                i.nisbah_investor_pct !== null ? formatPersen(i.nisbah_investor_pct) : '-'
              } · Saldo ${formatRupiah(i.saldo)}`,
            }))}
          value={utama?.investor_id ?? ''}
          onChange={pilihUtama}
          placeholder="Pilih investor utama"
          searchPlaceholder="Cari nama investor..."
          emptyText="Tidak ada investor dengan saldo tersedia"
        />
      </div>

      {!bisaUrunan ? null : (
        <>
          <div className="my-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[10px] bg-surface p-3">
              <p className="mm-label-caps">Total modal dibutuhkan</p>
              <Money value={totalModal} size="lg" className="mt-0.5 block" />
            </div>
            <div className="rounded-[10px] bg-surface p-3">
              <p className="mm-label-caps">Total saldo terpilih</p>
              <div className="mt-0.5 flex items-center gap-2">
                <Money value={totalSaldoTerpilih} size="lg" />
                {cukup ? (
                  <CheckCircle2 className="size-4 text-success" />
                ) : (
                  <AlertTriangle className="size-4 text-danger" />
                )}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[10px] bg-surface">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-3 py-2 text-left text-caps uppercase text-ink-subtle">Investor</th>
                  <th className="px-3 py-2 text-right text-caps uppercase text-ink-subtle">Saldo</th>
                  <th className="px-3 py-2 text-right text-caps uppercase text-ink-subtle">Alokasi</th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const lebih = r.amount > r.saldo
                  return (
                    <tr key={r.investor_id} className="border-b border-line last:border-0">
                      <td className="px-3 py-2 text-body text-ink">
                        {r.nama}
                        {i === 0 ? (
                          <span className="ml-1.5 text-label text-ink-subtle">(utama)</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Money value={r.saldo} className="text-ink-muted" />
                      </td>
                      <td className="px-3 py-2 text-right">
                        {manual ? (
                          <div className="ml-auto w-[170px]">
                            <MoneyInput
                              value={r.amount}
                              onChange={(v) =>
                                onChange(
                                  rows.map((x, idx) => (idx === i ? { ...x, amount: v } : x)),
                                )
                              }
                              className={cn('h-9', lebih && 'border-danger focus:border-danger')}
                              aria-label={`Alokasi untuk ${r.nama}`}
                            />
                          </div>
                        ) : (
                          <Money value={r.amount} className="font-medium" />
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {i > 0 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => hapusInvestor(r.investor_id)}
                            aria-label={`Hapus ${r.nama} dari urun dana`}
                            className="text-ink-subtle hover:text-danger"
                          >
                            <Trash2 />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-surface-alt">
                  <td className="px-3 py-2 text-label font-semibold text-ink" colSpan={2}>
                    Total alokasi
                  </td>
                  <td className="px-3 py-2 text-right" colSpan={2}>
                    <Money
                      value={validasi.totalAlokasi}
                      className={cn('font-semibold', !validasi.valid && 'text-danger')}
                    />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <SearchableSelect
              key={rows.length}
              options={kandidatTambahan.map((i) => ({
                value: i.investor_id,
                label: i.nama,
                keterangan: `Saldo ${formatRupiah(i.saldo)}`,
              }))}
              value=""
              onChange={tambahInvestor}
              placeholder="+ Tambah Investor"
              searchPlaceholder="Cari nama investor..."
              emptyText={
                nisbahUtama === null
                  ? 'Investor utama belum punya akad aktif dengan nisbah'
                  : `Tidak ada investor lain dengan nisbah ${formatPersen(nisbahUtama)}`
              }
              className="w-[240px]"
            />

            {rows.length > 1 ? (
              <label className="flex items-center gap-2 text-label text-ink">
                <Switch checked={manual} onCheckedChange={setManual} />
                Atur manual
              </label>
            ) : null}
          </div>

          {rows.length > 1 && kandidatTambahan.length === 0 ? (
            <p className="mt-2 text-label text-ink-subtle">
              Semua investor dengan nisbah {nisbahUtama !== null ? formatPersen(nisbahUtama) : '-'}{' '}
              sudah dipilih atau tidak punya saldo.
            </p>
          ) : null}

          {!cukup ? (
            <p className="mt-3 flex items-start gap-2 rounded-[10px] bg-danger-soft p-3 text-label text-danger">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Saldo investor terpilih tidak cukup. Kurang{' '}
                <strong>{formatRupiah(totalModal - totalSaldoTerpilih)}</strong>. Tambahkan
                investor lain dengan nisbah yang sama, atau kurangi harga.
              </span>
            </p>
          ) : manual && !validasi.valid ? (
            <p className="mt-3 text-label text-danger">{validasi.pesan[0]}</p>
          ) : null}

          {manual ? (
            <div className="mt-2 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(hitungUlangProporsional(rows))}
              >
                <RotateCcw />
                Hitung ulang proporsional
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
