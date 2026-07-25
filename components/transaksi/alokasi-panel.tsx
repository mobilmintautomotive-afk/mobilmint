'use client'

import * as React from 'react'
import { AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Money } from '@/components/shared/money'
import { Button } from '@/components/ui/button'
import { MoneyInput } from '@/components/ui/input'
import { Switch } from '@/components/ui/primitives'
import { formatPersen } from '@/lib/format'
import { hitungAlokasiProporsional, validasiAlokasi } from '@/lib/calc'
import type { InvestorBalance } from '@/types/database'

export type BarisAlokasi = {
  investor_id: string
  nama: string
  saldo: number
  porsi_pct: number
  amount: number
}

/**
 * Panel "Sumber Dana" (PRD 02 bagian B2 — LANGKAH KRITIS).
 * Menampilkan alokasi modal proporsional sebelum pembelian disimpan,
 * dengan opsi atur manual + validasi total harus PERSIS sama.
 */
export function AlokasiPanel({
  totalModal,
  saldoInvestor,
  rows,
  onChange,
  manual,
  onManualChange,
}: {
  totalModal: number
  saldoInvestor: InvestorBalance[]
  rows: BarisAlokasi[]
  onChange: (rows: BarisAlokasi[]) => void
  manual: boolean
  onManualChange: (v: boolean) => void
}) {
  const totalSaldo = saldoInvestor.reduce((s, i) => s + i.saldo, 0)
  const cukup = totalSaldo >= totalModal
  const kurang = Math.max(0, totalModal - totalSaldo)

  const hitungUlang = React.useCallback(() => {
    const hasil = hitungAlokasiProporsional(
      totalModal,
      saldoInvestor.map((i) => ({ investor_id: i.investor_id, nama: i.nama, saldo: i.saldo })),
    )
    onChange(hasil)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalModal, saldoInvestor])

  // Selama mode otomatis, alokasi selalu mengikuti total modal terbaru.
  React.useEffect(() => {
    if (!manual) hitungUlang()
  }, [manual, hitungUlang])

  const validasi = validasiAlokasi(totalModal, rows)

  return (
    <section className="rounded-lg border border-line bg-surface-alt p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-card-title text-ink">Sumber Dana</h4>
          <p className="text-label text-ink-muted">
            Modal diambil dari saldo investor, default proporsional.
          </p>
        </div>
        <label className="flex items-center gap-2 text-label text-ink">
          <Switch checked={manual} onCheckedChange={onManualChange} />
          Atur manual
        </label>
      </header>

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[10px] bg-surface p-3">
          <p className="mm-label-caps">Total modal dibutuhkan</p>
          <Money value={totalModal} size="lg" className="mt-0.5 block" />
        </div>
        <div className="rounded-[10px] bg-surface p-3">
          <p className="mm-label-caps">Total saldo tersedia</p>
          <div className="mt-0.5 flex items-center gap-2">
            <Money value={totalSaldo} size="lg" />
            {cukup ? (
              <CheckCircle2 className="size-4 text-success" />
            ) : (
              <AlertTriangle className="size-4 text-danger" />
            )}
          </div>
        </div>
      </div>

      {!cukup ? (
        <p className="mb-3 flex items-start gap-2 rounded-[10px] bg-danger-soft p-3 text-label text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Saldo investor tidak mencukupi. Kurang <strong>{fmt(kurang)}</strong>. Tambahkan setoran
            investor dulu lewat menu Akad Investor.
          </span>
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-[10px] bg-surface p-4 text-center text-label text-ink-muted">
          Belum ada investor dengan saldo tersedia.
        </p>
      ) : (
        <div className="overflow-hidden rounded-[10px] bg-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="px-3 py-2 text-left text-caps uppercase text-ink-subtle">Investor</th>
                <th className="px-3 py-2 text-right text-caps uppercase text-ink-subtle">Saldo</th>
                <th className="px-3 py-2 text-right text-caps uppercase text-ink-subtle">Porsi</th>
                <th className="px-3 py-2 text-right text-caps uppercase text-ink-subtle">Alokasi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const lebih = r.amount > r.saldo
                return (
                  <tr key={r.investor_id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2 text-body text-ink">{r.nama}</td>
                    <td className="px-3 py-2 text-right">
                      <Money value={r.saldo} className="text-ink-muted" />
                    </td>
                    <td className="px-3 py-2 text-right tnum text-label text-ink-muted">
                      {formatPersen(totalModal > 0 ? (r.amount / totalModal) * 100 : 0, 1)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {manual ? (
                        <div className="ml-auto w-[170px]">
                          <MoneyInput
                            value={r.amount}
                            onChange={(v) =>
                              onChange(rows.map((x, idx) => (idx === i ? { ...x, amount: v } : x)))
                            }
                            className={cn('h-9', lebih && 'border-danger focus:border-danger')}
                            aria-label={`Alokasi untuk ${r.nama}`}
                          />
                        </div>
                      ) : (
                        <Money value={r.amount} className="font-medium" />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-surface-alt">
                <td className="px-3 py-2 text-label font-semibold text-ink" colSpan={3}>
                  Total alokasi
                </td>
                <td className="px-3 py-2 text-right">
                  <Money
                    value={validasi.totalAlokasi}
                    className={cn('font-semibold', !validasi.valid && 'text-danger')}
                  />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {manual ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={hitungUlang}>
            <RotateCcw />
            Hitung ulang proporsional
          </Button>
          {!validasi.valid ? (
            <p className="text-label text-danger">{validasi.pesan[0]}</p>
          ) : (
            <p className="flex items-center gap-1.5 text-label text-success">
              <CheckCircle2 className="size-4" />
              Alokasi sudah pas
            </p>
          )}
        </div>
      ) : null}
    </section>
  )
}

function fmt(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`
}
