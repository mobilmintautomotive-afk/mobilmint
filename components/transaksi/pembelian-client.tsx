'use client'

import * as React from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, CarFront, Plus, ShoppingCart, Users } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/states'
import { Money } from '@/components/shared/money'
import { StatusBadge } from '@/components/shared/status-badge'
import { FormDialog, FormGrid } from '@/components/forms/form-dialog'
import { RincianBiayaRows } from '@/components/forms/rincian-biaya'
import { MobilFormDialog } from '@/components/master/mobil-form'
import { AlokasiPanel, type BarisAlokasi } from './alokasi-panel'
import { Button } from '@/components/ui/button'
import { Field, Input, MoneyInput, Textarea } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/select'
import { Switch } from '@/components/ui/primitives'
import { buatPembelian } from '@/app/actions/purchases'
import { formatRupiah, formatTanggal, todayJakarta } from '@/lib/format'
import { totalRincian, validasiAlokasi } from '@/lib/calc'
import { SUPPLIER_TYPE_LABEL } from '@/lib/constants'
import type { InvestorBalance, RincianBiaya } from '@/types/database'

type Pembelian = {
  id: string
  no_transaksi: string
  car_id: string
  tanggal_beli: string
  unit: string
  no_polisi: string | null
  status_unit: string | null
  supplier_nama: string
  harga_beli: number
  biaya_lain: number
  total_modal: number
}

type UnitOption = {
  id: string
  merek: string
  tipe: string
  tahun: number
  no_polisi: string | null
}

export function PembelianClient({
  rows,
  error,
  canWrite,
  unitTersedia,
  suppliers,
  saldoInvestor,
}: {
  rows: Pembelian[]
  error: string | null
  canWrite: boolean
  unitTersedia: UnitOption[]
  suppliers: { id: string; nama: string; tipe_supplier: string }[]
  saldoInvestor: InvestorBalance[]
}) {
  const [open, setOpen] = React.useState(false)

  const columns = React.useMemo<ColumnDef<Pembelian, any>[]>(
    () => [
      { accessorKey: 'no_transaksi', header: 'No. Transaksi' },
      {
        accessorKey: 'tanggal_beli',
        header: 'Tanggal',
        meta: { exportValue: (r: Pembelian) => r.tanggal_beli },
        cell: ({ getValue }) => formatTanggal(getValue() as string),
      },
      {
        accessorKey: 'unit',
        header: 'Unit',
        cell: ({ row }) => (
          <Link href={`/master/mobil/${row.original.car_id}`} className="min-w-0 hover:text-accent">
            <span className="block truncate font-medium">{row.original.unit}</span>
            <span className="block truncate text-label text-ink-muted">
              {row.original.no_polisi ?? '-'}
            </span>
          </Link>
        ),
      },
      { accessorKey: 'supplier_nama', header: 'Supplier' },
      {
        accessorKey: 'harga_beli',
        header: 'Harga Beli',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} />,
      },
      {
        accessorKey: 'biaya_lain',
        header: 'Biaya Lain',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} />,
      },
      {
        accessorKey: 'total_modal',
        header: 'Total Modal',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} className="font-medium" />,
      },
      {
        accessorKey: 'status_unit',
        header: 'Status Unit',
        meta: { align: 'center' as const },
        cell: ({ getValue }) =>
          getValue() ? <StatusBadge status={getValue() as string} /> : <span>-</span>,
      },
    ],
    [],
  )

  return (
    <>
      <DataTable<Pembelian>
        columns={columns}
        data={rows}
        searchKeys={['no_transaksi', 'unit', 'supplier_nama', 'no_polisi']}
        searchPlaceholder="Cari no. transaksi, unit, atau supplier..."
        exportName="pembelian-mobil"
        error={error}
        toolbarAction={
          canWrite ? (
            <Button onClick={() => setOpen(true)}>
              <Plus />
              <span className="hidden sm:inline">Pembelian Baru</span>
              <span className="sm:hidden">Baru</span>
            </Button>
          ) : null
        }
        empty={
          <EmptyState
            icon={ShoppingCart}
            title="Belum ada pembelian"
            description="Catat pembelian pertama untuk mulai mengisi stok dan mengalokasikan modal investor."
            action={
              canWrite ? (
                <Button onClick={() => setOpen(true)}>
                  <Plus />
                  Pembelian Baru
                </Button>
              ) : undefined
            }
          />
        }
        mobileCard={(row) => (
          <Link href={`/master/mobil/${row.car_id}`} className="block space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{row.unit}</p>
                <p className="text-label text-ink-muted">
                  {row.no_transaksi} · {row.supplier_nama}
                </p>
              </div>
              {row.status_unit ? <StatusBadge status={row.status_unit} /> : null}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-label text-ink-muted">{formatTanggal(row.tanggal_beli)}</span>
              <Money value={row.total_modal} className="font-medium" />
            </div>
          </Link>
        )}
      />

      <PembelianFormDialog
        open={open}
        onOpenChange={setOpen}
        unitTersedia={unitTersedia}
        suppliers={suppliers}
        saldoInvestor={saldoInvestor}
      />
    </>
  )
}

/* ------------------------- Form pembelian baru ------------------------ */

function PembelianFormDialog({
  open,
  onOpenChange,
  unitTersedia,
  suppliers,
  saldoInvestor,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  unitTersedia: UnitOption[]
  suppliers: { id: string; nama: string; tipe_supplier: string }[]
  saldoInvestor: InvestorBalance[]
}) {
  const [carId, setCarId] = React.useState('')
  const [supplierId, setSupplierId] = React.useState('')
  const [tanggal, setTanggal] = React.useState(todayJakarta())
  const [hargaBeli, setHargaBeli] = React.useState(0)
  const [biaya, setBiaya] = React.useState<RincianBiaya[]>([])
  const [catatan, setCatatan] = React.useState('')
  const [alokasi, setAlokasi] = React.useState<BarisAlokasi[]>([])
  const [manual, setManual] = React.useState(false)
  const [openUnitBaru, setOpenUnitBaru] = React.useState(false)

  // Default: 1 mobil dibiayai 1 investor. "Urun Dana" dinyalakan hanya kalau
  // saldo investor tunggal tidak cukup, baru pindah ke alokasi proporsional
  // multi-investor (AlokasiPanel) yang sudah ada.
  const [urunDana, setUrunDana] = React.useState(false)
  const [investorTunggalId, setInvestorTunggalId] = React.useState('')

  const totalModal = Math.round(hargaBeli) + totalRincian(biaya)

  const investorTunggal = saldoInvestor.find((i) => i.investor_id === investorTunggalId)
  const saldoTunggalCukup = investorTunggal ? investorTunggal.saldo >= totalModal : false

  const validasiPooling = validasiAlokasi(totalModal, alokasi)
  const totalSaldoPooling = saldoInvestor.reduce((s, i) => s + i.saldo, 0)
  const cukupPooling = totalSaldoPooling >= totalModal

  React.useEffect(() => {
    if (!open) return
    setCarId('')
    setSupplierId('')
    setTanggal(todayJakarta())
    setHargaBeli(0)
    setBiaya([])
    setCatatan('')
    setManual(false)
    setAlokasi([])
    setUrunDana(false)
    setInvestorTunggalId('')
  }, [open])

  const bisaSimpan =
    Boolean(carId) &&
    totalModal > 0 &&
    (urunDana
      ? cukupPooling && validasiPooling.valid
      : Boolean(investorTunggalId) && saldoTunggalCukup)

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        size="lg"
        title="Pembelian Mobil Baru"
        description="Cek panel Sumber Dana di bawah sebelum menyimpan — dana investor akan langsung terpotong."
        submitLabel="Simpan Pembelian"
        successMessage="Pembelian tersimpan dan modal investor sudah dialokasikan"
        disabled={!bisaSimpan}
        onSubmit={() =>
          buatPembelian({
            car_id: carId,
            supplier_id: supplierId || null,
            tanggal_beli: tanggal,
            harga_beli: hargaBeli,
            rincian_biaya_lain: biaya.filter((b) => b.nama && b.nominal > 0),
            catatan,
            alokasi: urunDana
              ? alokasi
                  .filter((a) => a.amount > 0)
                  .map((a) => ({ investor_id: a.investor_id, amount: a.amount }))
              : [{ investor_id: investorTunggalId, amount: totalModal }],
          })
        }
      >
        <div className="space-y-5">
          <FormGrid>
            <Field label="Unit Mobil" required htmlFor="pilih-unit" className="sm:col-span-2">
              <SearchableSelect
                id="pilih-unit"
                options={unitTersedia.map((u) => ({
                  value: u.id,
                  label: `${u.merek} ${u.tipe} ${u.tahun}`,
                  keterangan: u.no_polisi ?? 'Tanpa no. polisi',
                }))}
                value={carId}
                onChange={setCarId}
                placeholder="Pilih unit yang dibeli"
                searchPlaceholder="Cari merek, tipe..."
                emptyText="Semua unit sudah punya transaksi pembelian"
                footer={
                  <button
                    type="button"
                    onClick={() => setOpenUnitBaru(true)}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-label font-medium text-accent transition-colors hover:bg-accent-soft"
                  >
                    <CarFront className="size-4" />
                    Input Mobil Baru
                  </button>
                }
              />
            </Field>

            <Field label="Supplier" htmlFor="pilih-supplier">
              <SearchableSelect
                id="pilih-supplier"
                options={suppliers.map((s) => ({
                  value: s.id,
                  label: s.nama,
                  keterangan:
                    SUPPLIER_TYPE_LABEL[s.tipe_supplier as keyof typeof SUPPLIER_TYPE_LABEL],
                }))}
                value={supplierId}
                onChange={setSupplierId}
                placeholder="Pilih supplier"
              />
            </Field>

            <Field label="Tanggal Pembelian" required htmlFor="tgl-beli">
              <Input
                id="tgl-beli"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </Field>

            <Field label="Harga Beli" required className="sm:col-span-2">
              <MoneyInput value={hargaBeli} onChange={setHargaBeli} />
            </Field>
          </FormGrid>

          <RincianBiayaRows
            rows={biaya}
            onChange={setBiaya}
            placeholder="Contoh: biaya lelang, mutasi, derek"
          />

          <div className="flex items-center justify-between rounded-lg bg-cta px-4 py-3 text-white">
            <span className="text-label">Total Modal Unit</span>
            <span className="text-card-title tnum font-bold">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                maximumFractionDigits: 0,
              }).format(totalModal)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-line px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[10px] bg-accent-soft text-accent">
                <Users className="size-4" />
              </span>
              <div>
                <p className="text-label font-medium text-ink">Urun Dana</p>
                <p className="text-label text-ink-muted">
                  Aktifkan kalau saldo satu investor tidak cukup membiayai unit ini sendirian —
                  modal akan dibagi proporsional ke beberapa investor.
                </p>
              </div>
            </div>
            <Switch
              checked={urunDana}
              onCheckedChange={(v) => {
                setUrunDana(v)
                if (v) {
                  setInvestorTunggalId('')
                } else {
                  setAlokasi([])
                  setManual(false)
                }
              }}
            />
          </div>

          {!urunDana ? (
            <div className="space-y-3 rounded-lg border border-line bg-surface-alt p-4">
              <div>
                <h4 className="text-card-title text-ink">Investor Pendana</h4>
                <p className="text-label text-ink-muted">
                  Modal unit ini diambil penuh dari satu investor.
                </p>
              </div>

              <Field label="Pilih Investor" required htmlFor="investor-tunggal">
                <SearchableSelect
                  id="investor-tunggal"
                  options={saldoInvestor
                    .filter((i) => i.saldo > 0)
                    .map((i) => ({
                      value: i.investor_id,
                      label: i.nama,
                      keterangan: `Saldo tersedia: ${formatRupiah(i.saldo)}`,
                    }))}
                  value={investorTunggalId}
                  onChange={setInvestorTunggalId}
                  placeholder="Pilih investor pendana"
                  searchPlaceholder="Cari nama investor..."
                  emptyText="Tidak ada investor dengan saldo tersedia"
                />
              </Field>

              {investorTunggal ? (
                <div className="rounded-[10px] bg-surface p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-label text-ink-muted">Saldo tersedia</span>
                    <Money value={investorTunggal.saldo} className="font-medium" />
                  </div>
                  {totalModal > 0 && !saldoTunggalCukup ? (
                    <p className="mt-2 flex items-start gap-2 text-label text-danger">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      Saldo investor ini kurang {formatRupiah(totalModal - investorTunggal.saldo)}{' '}
                      untuk menutupi modal unit ini. Nyalakan Urun Dana untuk gabung dengan
                      investor lain.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <AlokasiPanel
              totalModal={totalModal}
              saldoInvestor={saldoInvestor}
              rows={alokasi}
              onChange={setAlokasi}
              manual={manual}
              onManualChange={setManual}
            />
          )}

          <Field label="Catatan" htmlFor="catatan-beli">
            <Textarea
              id="catatan-beli"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Kondisi saat dibeli, kesepakatan dengan supplier, dll."
            />
          </Field>
        </div>
      </FormDialog>

      <MobilFormDialog
        open={openUnitBaru}
        onOpenChange={setOpenUnitBaru}
        onSaved={(id) => setCarId(id)}
      />
    </>
  )
}
