'use client'

import * as React from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Banknote, CheckCheck, ChevronDown, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { Money } from '@/components/shared/money'
import { RowActions } from '@/components/shared/row-actions'
import { useConfirm } from '@/components/shared/confirm-dialog'
import { FormDialog, useAksi } from '@/components/forms/form-dialog'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/primitives'
import { prosesBagiHasil, batalkanBagiHasil } from '@/app/actions/profit-sharing'
import { simulasiBagiHasil } from '@/lib/calc'
import { formatPersen, formatTanggal, todayJakarta } from '@/lib/format'

type Menunggu = {
  id: string
  no_transaksi: string
  car_id: string
  unit: string
  no_polisi: string | null
  tanggal_jual: string
  harga_jual: number
  hpp_snapshot: number
  laba_bersih: number
  fundings: {
    investor_id: string
    nama: string
    amount: number
    nisbah_investor_pct: number
  }[]
}

type Riwayat = {
  id: string
  no_transaksi: string
  car_id: string
  unit: string
  no_polisi: string | null
  tanggal_proses: string
  tanggal_jual: string | null
  laba_bersih: number
  porsi_investor: number
  porsi_pengelola: number
  is_reversed: boolean
  details: {
    id: string
    nama: string
    modal_awal: number
    porsi_pct: number
    bagi_hasil: number
    modal_kembali: number
    total_kembali: number
  }[]
}

export function BagiHasilClient({
  menunggu,
  riwayat,
  error,
  canWrite,
}: {
  menunggu: Menunggu[]
  riwayat: Riwayat[]
  error: string | null
  canWrite: boolean
}) {
  const [simulasi, setSimulasi] = React.useState<Menunggu | null>(null)

  if (error) {
    return (
      <div className="mm-card">
        <ErrorState description={error} />
      </div>
    )
  }

  return (
    <>
      <Tabs defaultValue="menunggu">
        <TabsList>
          <TabsTrigger value="menunggu">
            Menunggu Diproses
            {menunggu.length > 0 ? (
              <span className="ml-1 rounded-full bg-warning-soft px-1.5 py-0.5 text-[11px] font-semibold text-warning-deep">
                {menunggu.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat</TabsTrigger>
        </TabsList>

        <TabsContent value="menunggu">
          <TabMenunggu rows={menunggu} canWrite={canWrite} onProses={setSimulasi} />
        </TabsContent>

        <TabsContent value="riwayat">
          <TabRiwayat rows={riwayat} canWrite={canWrite} />
        </TabsContent>
      </Tabs>

      {simulasi ? (
        <DialogSimulasi sale={simulasi} open onOpenChange={(v) => !v && setSimulasi(null)} />
      ) : null}
    </>
  )
}

/* ------------------------- Tab 1: Menunggu ------------------------- */

function TabMenunggu({
  rows,
  canWrite,
  onProses,
}: {
  rows: Menunggu[]
  canWrite: boolean
  onProses: (row: Menunggu) => void
}) {
  const columns = React.useMemo<ColumnDef<Menunggu, any>[]>(
    () => [
      {
        accessorKey: 'unit',
        header: 'Unit',
        cell: ({ row }) => (
          <Link href={`/master/mobil/${row.original.car_id}`} className="hover:text-accent">
            <span className="block font-medium">{row.original.unit}</span>
            <span className="block text-label text-ink-muted">
              {row.original.no_polisi ?? '-'} · {row.original.no_transaksi}
            </span>
          </Link>
        ),
      },
      {
        accessorKey: 'tanggal_jual',
        header: 'Tanggal Jual',
        meta: { exportValue: (r: Menunggu) => r.tanggal_jual },
        cell: ({ getValue }) => formatTanggal(getValue() as string),
      },
      {
        accessorKey: 'laba_bersih',
        header: 'Laba Bersih',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} colored className="font-medium" />,
      },
      {
        id: 'porsi_investor',
        header: 'Porsi Investor',
        accessorFn: (r) => simulasiBagiHasil({ labaBersih: r.laba_bersih, fundings: r.fundings }).porsiInvestor,
        meta: { align: 'right' as const },
        cell: ({ row }) => {
          const s = simulasiBagiHasil({
            labaBersih: row.original.laba_bersih,
            fundings: row.original.fundings,
          })
          return (
            <span className="tnum">
              <Money value={s.porsiInvestor} />
              <span className="ml-1 text-label text-ink-muted">
                ({formatPersen(s.nisbahPct)})
              </span>
            </span>
          )
        },
      },
      {
        id: 'aksi',
        header: '',
        enableSorting: false,
        meta: { align: 'right' as const },
        cell: ({ row }) =>
          canWrite ? (
            <Button size="sm" variant="accent" onClick={() => onProses(row.original)}>
              <Banknote />
              <span className="hidden lg:inline">Proses Bagi Hasil</span>
              <span className="lg:hidden">Proses</span>
            </Button>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canWrite],
  )

  return (
    <DataTable<Menunggu>
      columns={columns}
      data={rows}
      searchKeys={['unit', 'no_transaksi', 'no_polisi']}
      searchPlaceholder="Cari unit atau no. transaksi..."
      exportName="menunggu-bagi-hasil"
      empty={
        <EmptyState
          icon={CheckCheck}
          title="Semua sudah dibagi hasil"
          description="Tidak ada unit terjual yang menunggu proses bagi hasil. Kerja bagus!"
        />
      }
      mobileCard={(row) => {
        const s = simulasiBagiHasil({ labaBersih: row.laba_bersih, fundings: row.fundings })
        return (
          <div className="space-y-2">
            <div>
              <p className="font-medium text-ink">{row.unit}</p>
              <p className="text-label text-ink-muted">
                {row.no_transaksi} · {formatTanggal(row.tanggal_jual)}
              </p>
            </div>
            <div className="flex items-center justify-between text-label">
              <span className="text-ink-muted">Laba bersih</span>
              <Money value={row.laba_bersih} colored className="font-medium" />
            </div>
            <div className="flex items-center justify-between text-label">
              <span className="text-ink-muted">Porsi investor</span>
              <Money value={s.porsiInvestor} className="font-medium text-ink" />
            </div>
            {canWrite ? (
              <Button size="sm" variant="accent" className="w-full" onClick={() => onProses(row)}>
                <Banknote />
                Proses Bagi Hasil
              </Button>
            ) : null}
          </div>
        )
      }}
    />
  )
}

/* -------------------------- Tab 2: Riwayat -------------------------- */

function TabRiwayat({ rows, canWrite }: { rows: Riwayat[]; canWrite: boolean }) {
  const [buka, setBuka] = React.useState<string | null>(null)
  const { confirm, dialog } = useConfirm()
  const { jalankan } = useAksi()

  if (rows.length === 0) {
    return (
      <div className="mm-card">
        <EmptyState
          icon={Banknote}
          title="Belum ada bagi hasil"
          description="Riwayat pembagian keuntungan akan muncul di sini setelah unit pertama diproses."
        />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {rows.map((r) => {
          const terbuka = buka === r.id
          const totalKembali = r.details.reduce((s, d) => s + d.total_kembali, 0)
          return (
            <div key={r.id} className={cn('mm-card', r.is_reversed && 'opacity-70')}>
              <button
                type="button"
                onClick={() => setBuka(terbuka ? null : r.id)}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{r.unit}</p>
                    {r.is_reversed ? (
                      <span className="rounded-full bg-danger-soft px-2.5 py-1 text-[12px] font-medium text-danger">
                        Dibatalkan
                      </span>
                    ) : null}
                  </div>
                  <p className="text-label text-ink-muted">
                    {r.no_transaksi} · diproses {formatTanggal(r.tanggal_proses)} ·{' '}
                    {r.details.length} investor
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="mm-label-caps">Porsi investor</p>
                    <Money value={r.porsi_investor} className="font-semibold" />
                  </div>
                  <ChevronDown
                    className={cn(
                      'size-4 text-ink-subtle transition-transform',
                      terbuka && 'rotate-180',
                    )}
                  />
                </div>
              </button>

              {terbuka ? (
                <div className="mt-4 border-t border-line pt-4">
                  <div className="mb-3 grid gap-3 sm:grid-cols-3">
                    <Ringkas label="Laba bersih" value={r.laba_bersih} />
                    <Ringkas label="Porsi investor" value={r.porsi_investor} />
                    <Ringkas label="Porsi pengelola" value={r.porsi_pengelola} />
                  </div>

                  <div className="mm-scroll overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-line">
                          <th className="py-2 text-left text-caps uppercase text-ink-subtle">Investor</th>
                          <th className="py-2 text-right text-caps uppercase text-ink-subtle">Modal</th>
                          <th className="py-2 text-right text-caps uppercase text-ink-subtle">Porsi</th>
                          <th className="py-2 text-right text-caps uppercase text-ink-subtle">Bagi Hasil</th>
                          <th className="py-2 text-right text-caps uppercase text-ink-subtle">Total Kembali</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.details.map((d) => (
                          <tr key={d.id} className="border-b border-line last:border-0">
                            <td className="py-2.5 text-body text-ink">{d.nama}</td>
                            <td className="py-2.5 text-right">
                              <Money value={d.modal_awal} />
                            </td>
                            <td className="py-2.5 text-right tnum text-label text-ink-muted">
                              {formatPersen(d.porsi_pct, 1)}
                            </td>
                            <td className="py-2.5 text-right">
                              <Money value={d.bagi_hasil} colored />
                            </td>
                            <td className="py-2.5 text-right">
                              <Money value={d.total_kembali} className="font-medium" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td className="pt-2.5 text-label font-semibold text-ink" colSpan={4}>
                            Total dikembalikan ke saldo investor
                          </td>
                          <td className="pt-2.5 text-right">
                            <Money value={totalKembali} className="font-semibold" />
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {canWrite && !r.is_reversed ? (
                    <div className="mt-4 flex justify-end">
                      <RowActions
                        actions={[
                          {
                            label: 'Batalkan Bagi Hasil',
                            icon: RotateCcw,
                            tone: 'danger',
                            onSelect: () =>
                              confirm({
                                title: 'Batalkan bagi hasil ini?',
                                description:
                                  'Data lama tidak dihapus. Sistem membuat entri mutasi pembalik supaya jejak audit tetap utuh, dan status unit kembali ke Terjual.',
                                confirmLabel: 'Ya, batalkan',
                                successMessage: 'Bagi hasil dibatalkan lewat entri pembalik',
                                onConfirm: async () => {
                                  const ok = await jalankan(() =>
                                    batalkanBagiHasil(r.id, todayJakarta()),
                                  )
                                  if (!ok) throw new Error('')
                                },
                              }),
                          },
                        ]}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      {dialog}
    </>
  )
}

function Ringkas({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] bg-surface-alt p-3">
      <p className="mm-label-caps">{label}</p>
      <Money value={value} colored className="mt-0.5 block font-semibold" />
    </div>
  )
}

/* ---------------------- Dialog simulasi & proses ---------------------- */

function DialogSimulasi({
  sale,
  open,
  onOpenChange,
}: {
  sale: Menunggu
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [tanggal, setTanggal] = React.useState(todayJakarta())
  const s = simulasiBagiHasil({ labaBersih: sale.laba_bersih, fundings: sale.fundings })
  const rugi = sale.laba_bersih < 0

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Simulasi Bagi Hasil"
      description={`${sale.unit}${sale.no_polisi ? ` — ${sale.no_polisi}` : ''}`}
      submitLabel="Konfirmasi & Proses"
      successMessage={`Bagi hasil berhasil diproses. Saldo ${s.rows.length} investor telah diperbarui.`}
      disabled={s.rows.length === 0}
      onSubmit={() => prosesBagiHasil({ car_sale_id: sale.id, tanggal_proses: tanggal })}
    >
      <div className="space-y-4">
        <div
          className={cn(
            'grid gap-3 rounded-lg p-4 sm:grid-cols-3',
            rugi ? 'bg-danger-soft' : 'bg-accent-soft',
          )}
        >
          <div>
            <p className="mm-label-caps">{rugi ? 'Rugi bersih' : 'Laba bersih'}</p>
            <Money value={sale.laba_bersih} colored className="mt-0.5 block font-semibold" />
          </div>
          <div>
            <p className="mm-label-caps">Porsi investor ({formatPersen(s.nisbahPct)})</p>
            <Money value={s.porsiInvestor} colored className="mt-0.5 block font-semibold" />
          </div>
          <div>
            <p className="mm-label-caps">Porsi pengelola</p>
            <Money value={s.porsiPengelola} colored className="mt-0.5 block font-semibold" />
          </div>
        </div>

        {rugi ? (
          <p className="rounded-lg bg-warning-soft p-3 text-label text-warning-deep">
            Unit ini rugi. Kerugian dibagi proporsional ke modal investor — modal yang kembali jadi
            lebih kecil dari modal awal. Angka minus di bawah memang disengaja.
          </p>
        ) : null}

        {s.rows.length === 0 ? (
          <p className="rounded-lg bg-danger-soft p-3 text-label text-danger">
            Unit ini tidak punya alokasi modal investor, jadi bagi hasil tidak bisa diproses.
          </p>
        ) : (
          <div className="mm-scroll overflow-x-auto rounded-lg border border-line">
            <table className="w-full">
              <thead className="bg-surface-alt">
                <tr>
                  <th className="px-3 py-2 text-left text-caps uppercase text-ink-subtle">Investor</th>
                  <th className="px-3 py-2 text-right text-caps uppercase text-ink-subtle">Modal</th>
                  <th className="px-3 py-2 text-right text-caps uppercase text-ink-subtle">Porsi</th>
                  <th className="px-3 py-2 text-right text-caps uppercase text-ink-subtle">Bagi Hasil</th>
                  <th className="px-3 py-2 text-right text-caps uppercase text-ink-subtle">Total Kembali</th>
                </tr>
              </thead>
              <tbody>
                {s.rows.map((r) => (
                  <tr key={r.investor_id} className="border-t border-line">
                    <td className="px-3 py-2.5 text-body text-ink">{r.nama}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Money value={r.modal} />
                    </td>
                    <td className="px-3 py-2.5 text-right tnum text-label text-ink-muted">
                      {formatPersen(r.porsi_pct, 1)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Money value={r.bagi_hasil} colored />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Money value={r.total_kembali} className="font-medium" />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-alt">
                <tr className="border-t border-line">
                  <td className="px-3 py-2.5 text-label font-semibold text-ink">TOTAL</td>
                  <td className="px-3 py-2.5 text-right">
                    <Money value={s.totalModal} className="font-semibold" />
                  </td>
                  <td className="px-3 py-2.5 text-right tnum text-label text-ink-muted">100%</td>
                  <td className="px-3 py-2.5 text-right">
                    <Money value={s.porsiInvestor} className="font-semibold" />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Money
                      value={s.totalModal + s.porsiInvestor}
                      className="font-semibold"
                    />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <Field label="Tanggal Proses" required htmlFor="tgl-bagi-hasil">
          <Input
            id="tgl-bagi-hasil"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </Field>

        <p className="rounded-lg bg-surface-alt p-3 text-label text-ink-muted">
          Setelah dikonfirmasi, sistem membuat entri <strong>Modal Kembali</strong> dan{' '}
          <strong>Bagi Hasil</strong> untuk tiap investor dalam satu transaksi database, lalu status
          unit berubah jadi <strong>Selesai</strong>. Kalau ada yang gagal, tidak ada perubahan
          saldo sama sekali.
        </p>
      </div>
    </FormDialog>
  )
}
