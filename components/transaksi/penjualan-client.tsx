'use client'

import * as React from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Ban, Plus, Receipt, UserPlus } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/states'
import { Money } from '@/components/shared/money'
import { BagiHasilBadge } from '@/components/shared/status-badge'
import { RowActions } from '@/components/shared/row-actions'
import { useConfirm } from '@/components/shared/confirm-dialog'
import { FormDialog, FormGrid, useAksi } from '@/components/forms/form-dialog'
import { RincianBiayaRows } from '@/components/forms/rincian-biaya'
import { Button } from '@/components/ui/button'
import { Field, Input, MoneyInput, Textarea } from '@/components/ui/input'
import {
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { buatPenjualan, batalkanPenjualan } from '@/app/actions/sales'
import { simpanCustomer } from '@/app/actions/master'
import { hitungPenjualan, totalRincian } from '@/lib/calc'
import { formatPersen, formatRupiah, formatTanggal, todayJakarta } from '@/lib/format'
import { PAYMENT_METHOD, PAYMENT_METHOD_LABEL } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { RincianBiaya } from '@/types/database'

type Penjualan = {
  id: string
  no_transaksi: string
  car_id: string
  unit: string
  no_polisi: string | null
  tanggal_jual: string
  customer_nama: string
  sales_nama: string
  harga_jual: number
  hpp_snapshot: number
  laba_bersih: number
  is_profit_shared: boolean
}

type UnitSiapJual = {
  id: string
  label: string
  no_polisi: string | null
  hpp: number
  modal_pembelian: number
  total_perbaikan: number
  total_modal_investor: number
  nisbah_investor_pct: number
}

export function PenjualanClient({
  rows,
  error,
  canWrite,
  units,
  customers,
  sales,
  unitTerpilih,
}: {
  rows: Penjualan[]
  error: string | null
  canWrite: boolean
  units: UnitSiapJual[]
  customers: { id: string; nama: string; no_tlp: string | null }[]
  sales: { id: string; nama: string; komisi_default: number }[]
  unitTerpilih: string | null
}) {
  const [open, setOpen] = React.useState(Boolean(unitTerpilih))
  const { confirm, dialog } = useConfirm()
  const { jalankan } = useAksi()

  const columns = React.useMemo<ColumnDef<Penjualan, any>[]>(
    () => [
      { accessorKey: 'no_transaksi', header: 'No. Transaksi' },
      {
        accessorKey: 'tanggal_jual',
        header: 'Tanggal',
        meta: { exportValue: (r: Penjualan) => r.tanggal_jual },
        cell: ({ getValue }) => formatTanggal(getValue() as string),
      },
      {
        accessorKey: 'unit',
        header: 'Unit',
        cell: ({ row }) => (
          <Link href={`/master/mobil/${row.original.car_id}`} className="hover:text-accent">
            <span className="block font-medium">{row.original.unit}</span>
            <span className="block text-label text-ink-muted">{row.original.no_polisi ?? '-'}</span>
          </Link>
        ),
      },
      { accessorKey: 'customer_nama', header: 'Customer' },
      { accessorKey: 'sales_nama', header: 'Sales' },
      {
        accessorKey: 'harga_jual',
        header: 'Harga Jual',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} />,
      },
      {
        accessorKey: 'hpp_snapshot',
        header: 'HPP',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} />,
      },
      {
        accessorKey: 'laba_bersih',
        header: 'Laba Bersih',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => (
          <Money value={getValue() as number} colored className="font-medium" />
        ),
      },
      {
        accessorKey: 'is_profit_shared',
        header: 'Bagi Hasil',
        meta: {
          align: 'center' as const,
          exportValue: (r: Penjualan) => (r.is_profit_shared ? 'Sudah' : 'Belum'),
        },
        cell: ({ getValue }) => <BagiHasilBadge sudah={Boolean(getValue())} />,
      },
      {
        id: 'aksi',
        header: '',
        enableSorting: false,
        meta: { align: 'right' as const },
        cell: ({ row }) =>
          canWrite ? (
            <RowActions
              actions={[
                {
                  label: 'Batalkan Penjualan',
                  icon: Ban,
                  tone: 'danger',
                  disabled: row.original.is_profit_shared,
                  alasan: 'Bagi hasil sudah diproses',
                  onSelect: () =>
                    confirm({
                      title: 'Batalkan penjualan ini?',
                      description: `Transaksi ${row.original.no_transaksi} akan dihapus dan unit ${row.original.unit} kembali ke Ready Stock.`,
                      confirmLabel: 'Ya, batalkan',
                      successMessage: 'Penjualan dibatalkan',
                      onConfirm: async () => {
                        const ok = await jalankan(() => batalkanPenjualan(row.original.id))
                        if (!ok) throw new Error('')
                      },
                    }),
                },
              ]}
            />
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canWrite],
  )

  return (
    <>
      <DataTable<Penjualan>
        columns={columns}
        data={rows}
        searchKeys={['no_transaksi', 'unit', 'customer_nama', 'sales_nama', 'no_polisi']}
        searchPlaceholder="Cari no. transaksi, unit, atau customer..."
        exportName="penjualan"
        error={error}
        toolbarAction={
          canWrite ? (
            <Button onClick={() => setOpen(true)}>
              <Plus />
              <span className="hidden sm:inline">Penjualan Baru</span>
              <span className="sm:hidden">Baru</span>
            </Button>
          ) : null
        }
        empty={
          <EmptyState
            icon={Receipt}
            title="Belum ada penjualan"
            description="Setelah ada unit berstatus Ready Stock, catat penjualannya di sini."
            action={
              canWrite ? (
                <Button onClick={() => setOpen(true)}>
                  <Plus />
                  Penjualan Baru
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
                  {row.no_transaksi} · {row.customer_nama}
                </p>
              </div>
              <BagiHasilBadge sudah={row.is_profit_shared} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-label text-ink-muted">{formatTanggal(row.tanggal_jual)}</span>
              <Money value={row.laba_bersih} colored className="font-medium" />
            </div>
          </Link>
        )}
      />

      <PenjualanFormDialog
        open={open}
        onOpenChange={setOpen}
        units={units}
        customers={customers}
        sales={sales}
        unitAwal={unitTerpilih}
      />
      {dialog}
    </>
  )
}

/* ------------------------- Form penjualan baru ------------------------ */

function PenjualanFormDialog({
  open,
  onOpenChange,
  units,
  customers,
  sales,
  unitAwal,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  units: UnitSiapJual[]
  customers: { id: string; nama: string; no_tlp: string | null }[]
  sales: { id: string; nama: string; komisi_default: number }[]
  unitAwal: string | null
}) {
  const [carId, setCarId] = React.useState(unitAwal ?? '')
  const [customerId, setCustomerId] = React.useState('')
  const [salesId, setSalesId] = React.useState('')
  const [tanggal, setTanggal] = React.useState(todayJakarta())
  const [hargaJual, setHargaJual] = React.useState(0)
  const [komisi, setKomisi] = React.useState(0)
  const [biaya, setBiaya] = React.useState<RincianBiaya[]>([])
  const [metode, setMetode] = React.useState<string>('TRANSFER')
  const [catatan, setCatatan] = React.useState('')
  const [openCustomerBaru, setOpenCustomerBaru] = React.useState(false)
  const [namaCustBaru, setNamaCustBaru] = React.useState('')
  const [tlpCustBaru, setTlpCustBaru] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setCarId(unitAwal ?? '')
    setCustomerId('')
    setSalesId('')
    setTanggal(todayJakarta())
    setHargaJual(0)
    setKomisi(0)
    setBiaya([])
    setMetode('TRANSFER')
    setCatatan('')
  }, [open, unitAwal])

  // Komisi terisi otomatis dari komisi default sales, tetap bisa diubah.
  React.useEffect(() => {
    const s = sales.find((x) => x.id === salesId)
    if (s) setKomisi(s.komisi_default)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesId])

  const unit = units.find((u) => u.id === carId)
  const hasil = hitungPenjualan({
    hargaJual,
    hpp: unit?.hpp ?? 0,
    komisiSales: komisi,
    biayaLain: totalRincian(biaya),
    nisbahInvestorPct: unit?.nisbah_investor_pct ?? 0,
  })

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        size="lg"
        title="Penjualan Baru"
        description="Panel kalkulasi di bawah ikut berubah saat Anda mengetik."
        submitLabel="Simpan Penjualan"
        successMessage="Penjualan tersimpan. Lanjutkan ke Bagi Hasil untuk mengembalikan modal investor."
        disabled={!carId || hargaJual <= 0}
        onSubmit={() =>
          buatPenjualan({
            car_id: carId,
            customer_id: customerId || null,
            sales_person_id: salesId || null,
            tanggal_jual: tanggal,
            harga_jual: hargaJual,
            komisi_sales: komisi,
            rincian_biaya_lain: biaya.filter((b) => b.nama && b.nominal > 0),
            metode_bayar: metode,
            catatan,
          })
        }
      >
        <div className="space-y-5 pb-2">
          <Field label="Unit Mobil" required htmlFor="jual-unit">
            <SearchableSelect
              id="jual-unit"
              options={units.map((u) => ({
                value: u.id,
                label: u.label,
                keterangan: `${u.no_polisi ?? 'Tanpa no. polisi'} · HPP ${formatRupiah(u.hpp)}`,
              }))}
              value={carId}
              onChange={setCarId}
              placeholder="Pilih unit ready stock"
              emptyText="Belum ada unit berstatus Ready Stock"
            />
          </Field>

          <FormGrid>
            <Field label="Customer" htmlFor="jual-customer">
              <SearchableSelect
                id="jual-customer"
                options={customers.map((c) => ({
                  value: c.id,
                  label: c.nama,
                  keterangan: c.no_tlp ?? undefined,
                }))}
                value={customerId}
                onChange={setCustomerId}
                placeholder="Pilih customer"
                footer={
                  <button
                    type="button"
                    onClick={() => setOpenCustomerBaru(true)}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-label font-medium text-accent transition-colors hover:bg-accent-soft"
                  >
                    <UserPlus className="size-4" />
                    Customer Baru
                  </button>
                }
              />
            </Field>

            <Field label="Sales" hint="Kosongkan kalau tanpa sales" htmlFor="jual-sales">
              <SearchableSelect
                id="jual-sales"
                options={[
                  { value: '', label: 'Tanpa Sales' },
                  ...sales.map((s) => ({
                    value: s.id,
                    label: s.nama,
                    keterangan: `Komisi default ${formatRupiah(s.komisi_default)}`,
                  })),
                ]}
                value={salesId}
                onChange={setSalesId}
                placeholder="Pilih sales"
              />
            </Field>

            <Field label="Tanggal Jual" required htmlFor="tgl-jual">
              <Input
                id="tgl-jual"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </Field>

            <Field label="Metode Pembayaran" htmlFor="metode-bayar">
              <Select value={metode} onValueChange={setMetode}>
                <SelectTrigger id="metode-bayar">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD.map((m) => (
                    <SelectItem key={m} value={m}>
                      {PAYMENT_METHOD_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Harga Jual" required>
              <MoneyInput value={hargaJual} onChange={setHargaJual} />
            </Field>

            <Field label="Komisi Sales" hint="Terisi dari komisi default, bisa diubah">
              <MoneyInput value={komisi} onChange={setKomisi} />
            </Field>
          </FormGrid>

          <RincianBiayaRows
            label="Biaya Penjualan Lain"
            rows={biaya}
            onChange={setBiaya}
            placeholder="Contoh: biaya administrasi, balik nama"
          />

          <Field label="Catatan" htmlFor="catatan-jual">
            <Textarea
              id="catatan-jual"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </Field>

          {/* Panel kalkulasi live — sticky di mobile supaya angka laba selalu terlihat */}
          <div className="sticky bottom-0 -mx-5 -mb-5 sm:static sm:mx-0 sm:mb-0">
            <PanelKalkulasi hasil={hasil} unit={unit} />
          </div>
        </div>
      </FormDialog>

      <FormDialog
        open={openCustomerBaru}
        onOpenChange={(v) => {
          setOpenCustomerBaru(v)
          if (v) {
            setNamaCustBaru('')
            setTlpCustBaru('')
          }
        }}
        size="sm"
        title="Customer Baru"
        successMessage="Customer baru ditambahkan"
        onSubmit={async () => {
          const res = await simpanCustomer({ nama: namaCustBaru, no_tlp: tlpCustBaru })
          if (res.ok && res.data?.id) setCustomerId(res.data.id)
          return res
        }}
      >
        <div className="space-y-4">
          <Field label="Nama Customer" required htmlFor="nama-cust-baru">
            <Input
              id="nama-cust-baru"
              value={namaCustBaru}
              onChange={(e) => setNamaCustBaru(e.target.value)}
            />
          </Field>
          <Field label="No. Telepon" htmlFor="tlp-cust-baru">
            <Input
              id="tlp-cust-baru"
              value={tlpCustBaru}
              onChange={(e) => setTlpCustBaru(e.target.value)}
            />
          </Field>
        </div>
      </FormDialog>
    </>
  )
}

function PanelKalkulasi({
  hasil,
  unit,
}: {
  hasil: ReturnType<typeof hitungPenjualan>
  unit?: UnitSiapJual
}) {
  const rugi = hasil.rugi
  return (
    <div
      className={cn(
        'rounded-lg p-4 shadow-lg sm:shadow-none',
        rugi ? 'bg-danger-soft' : 'bg-surface-alt',
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className={cn('text-card-title', rugi ? 'text-danger' : 'text-ink')}>
          {rugi ? 'RUGI' : 'Kalkulasi Laba'}
        </h4>
        {unit ? (
          <span className="text-label text-ink-muted">
            Nisbah investor {formatPersen(unit.nisbah_investor_pct)}
          </span>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Baris label="Harga Jual" value={hasil.hargaJual} />
        <Baris label="HPP Unit" value={-hasil.hpp} sub />
        <div className="my-1 border-t border-line-strong/50" />
        <Baris label="Laba Kotor" value={hasil.labaKotor} tebal />
        <Baris label="Komisi Sales" value={-hasil.komisiSales} sub />
        <Baris label="Biaya Lain" value={-hasil.biayaLain} sub />
        <div className="my-1 border-t border-line-strong/50" />
        <div className="flex items-center justify-between">
          <span className={cn('font-semibold', rugi ? 'text-danger' : 'text-ink')}>
            {rugi ? 'Rugi Bersih' : 'Laba Bersih'}
          </span>
          <Money value={hasil.labaBersih} size="lg" colored />
        </div>
        {unit && unit.nisbah_investor_pct > 0 ? (
          <div className="mt-2 space-y-1 border-t border-line-strong/50 pt-2">
            <Baris
              label={`Porsi Investor (${formatPersen(unit.nisbah_investor_pct)})`}
              value={hasil.porsiInvestor}
              sub
            />
            <Baris
              label={`Porsi Pengelola (${formatPersen(100 - unit.nisbah_investor_pct)})`}
              value={hasil.porsiPengelola}
              sub
            />
          </div>
        ) : null}
      </div>

      <p className="mt-3 text-label text-ink-muted">
        Saldo investor belum berubah sampai bagi hasil diproses.
      </p>
    </div>
  )
}

function Baris({
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
        {label}
      </span>
      <Money value={value} className={sub ? 'text-label text-ink-muted' : tebal ? 'font-medium' : ''} />
    </div>
  )
}
