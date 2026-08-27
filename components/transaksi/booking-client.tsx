'use client'

import * as React from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Ban, BookmarkCheck, CheckCircle2, Pencil, Plus, UserPlus } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/states'
import { Money } from '@/components/shared/money'
import { RowActions } from '@/components/shared/row-actions'
import { useConfirm } from '@/components/shared/confirm-dialog'
import { FormDialog, FormGrid, useAksi } from '@/components/forms/form-dialog'
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
import { buatBooking, perbaruiBooking, batalkanBooking } from '@/app/actions/bookings'
import { simpanCustomer } from '@/app/actions/master'
import { formatRupiah, formatTanggal, todayJakarta } from '@/lib/format'
import { PAYMENT_METHOD, PAYMENT_METHOD_LABEL } from '@/lib/constants'

type Booking = {
  id: string
  no_booking: string
  car_id: string
  unit: string
  no_polisi: string | null
  customer_id: string | null
  customer_nama: string
  customer_tlp: string | null
  sales_person_id: string | null
  sales_nama: string
  tanggal_booking: string
  harga_sepakat: number
  dp_amount: number
  sisa_pelunasan: number
  metode_bayar: string
  catatan: string | null
}

type UnitOption = {
  id: string
  label: string
  no_polisi: string | null
  hpp: number
}

/**
 * Booking (DP) — customer bayar uang muka dulu, unit ditahan (TERBOOKING)
 * sampai lunas. Terpisah dari tabel Penjualan karena belum jadi transaksi
 * final: belum ada HPP terkunci, belum ada bagi hasil investor.
 */
export function BookingClient({
  rows,
  error,
  canWrite,
  units,
  customers,
  sales,
}: {
  rows: Booking[]
  error: string | null
  canWrite: boolean
  units: UnitOption[]
  customers: { id: string; nama: string; no_tlp: string | null }[]
  sales: { id: string; nama: string; komisi_default: number }[]
}) {
  const [openBaru, setOpenBaru] = React.useState(false)
  const [editing, setEditing] = React.useState<Booking | null>(null)
  const { confirm, dialog } = useConfirm()
  const { jalankan } = useAksi()

  const columns = React.useMemo<ColumnDef<Booking, any>[]>(
    () => [
      { accessorKey: 'no_booking', header: 'No. Booking' },
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
      {
        accessorKey: 'tanggal_booking',
        header: 'Tanggal Booking',
        meta: { exportValue: (r: Booking) => r.tanggal_booking },
        cell: ({ getValue }) => formatTanggal(getValue() as string),
      },
      {
        accessorKey: 'harga_sepakat',
        header: 'Harga Sepakat',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} />,
      },
      {
        accessorKey: 'dp_amount',
        header: 'DP Diterima',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} className="text-success" />,
      },
      {
        accessorKey: 'sisa_pelunasan',
        header: 'Sisa Pelunasan',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} className="font-medium" />,
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
                  label: 'Edit Booking',
                  icon: Pencil,
                  onSelect: () => setEditing(row.original),
                },
                {
                  label: 'Lunasi',
                  icon: CheckCircle2,
                  href: `/transaksi/penjualan?booking=${row.original.id}`,
                },
                {
                  label: 'Batalkan Booking',
                  icon: Ban,
                  tone: 'danger',
                  onSelect: () =>
                    confirm({
                      title: 'Batalkan booking ini?',
                      description: `Booking ${row.original.no_booking} akan dibatalkan dan unit ${row.original.unit} kembali ke Ready Stock. DP yang sudah diterima perlu direkonsiliasi manual sesuai kesepakatan dengan customer.`,
                      confirmLabel: 'Ya, batalkan',
                      successMessage: 'Booking dibatalkan',
                      onConfirm: async () => {
                        const ok = await jalankan(() => batalkanBooking(row.original.id))
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

  if (rows.length === 0 && !canWrite) return null

  return (
    <div className="mb-5">
      <DataTable<Booking>
        columns={columns}
        data={rows}
        searchKeys={['no_booking', 'unit', 'customer_nama', 'no_polisi']}
        searchPlaceholder="Cari no. booking, unit, atau customer..."
        exportName="booking-aktif"
        error={error}
        toolbarAction={
          canWrite ? (
            <Button variant="secondary" onClick={() => setOpenBaru(true)}>
              <Plus />
              <span className="hidden sm:inline">Booking Baru</span>
              <span className="sm:hidden">Booking</span>
            </Button>
          ) : null
        }
        empty={
          <EmptyState
            icon={BookmarkCheck}
            title="Belum ada booking aktif"
            description="Kalau customer baru bayar DP dan belum lunas, catat di sini supaya unitnya ditahan dulu (tidak ditawarkan ke pembeli lain)."
            action={
              canWrite ? (
                <Button variant="secondary" onClick={() => setOpenBaru(true)}>
                  <Plus />
                  Booking Baru
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
                  {row.no_booking} · {row.customer_nama}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-label text-ink-muted">DP {formatRupiah(row.dp_amount)}</span>
              <Money value={row.sisa_pelunasan} className="font-medium" />
            </div>
          </Link>
        )}
      />

      <BookingFormDialog
        open={openBaru}
        onOpenChange={setOpenBaru}
        units={units}
        customers={customers}
        sales={sales}
      />
      <BookingFormDialog
        open={Boolean(editing)}
        onOpenChange={(v) => !v && setEditing(null)}
        booking={editing}
        units={units}
        customers={customers}
        sales={sales}
      />
      {dialog}
    </div>
  )
}

/* --------------------- Form booking baru / edit ---------------------- */

function BookingFormDialog({
  open,
  onOpenChange,
  booking = null,
  units,
  customers,
  sales,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  booking?: Booking | null
  units: UnitOption[]
  customers: { id: string; nama: string; no_tlp: string | null }[]
  sales: { id: string; nama: string; komisi_default: number }[]
}) {
  const [carId, setCarId] = React.useState('')
  const [customerId, setCustomerId] = React.useState('')
  const [salesId, setSalesId] = React.useState('')
  const [tanggal, setTanggal] = React.useState(todayJakarta())
  const [hargaSepakat, setHargaSepakat] = React.useState(0)
  const [dpAmount, setDpAmount] = React.useState(0)
  const [metode, setMetode] = React.useState<string>('TRANSFER')
  const [catatan, setCatatan] = React.useState('')
  const [openCustomerBaru, setOpenCustomerBaru] = React.useState(false)
  const [namaCustBaru, setNamaCustBaru] = React.useState('')
  const [tlpCustBaru, setTlpCustBaru] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setCarId(booking?.car_id ?? '')
    setCustomerId(booking?.customer_id ?? '')
    setSalesId(booking?.sales_person_id ?? '')
    setTanggal(booking?.tanggal_booking ?? todayJakarta())
    setHargaSepakat(booking?.harga_sepakat ?? 0)
    setDpAmount(booking?.dp_amount ?? 0)
    setMetode(booking?.metode_bayar ?? 'TRANSFER')
    setCatatan(booking?.catatan ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking?.id])

  const unit = units.find((u) => u.id === carId)

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        size="lg"
        title={booking ? `Edit Booking ${booking.no_booking}` : 'Booking Baru'}
        description={
          booking
            ? 'Ubah harga sepakat, DP, atau data lain. Unit tidak bisa diganti dari sini — batalkan booking ini lalu buat booking baru kalau unitnya salah.'
            : 'Untuk customer yang baru bayar DP dan belum lunas. Unit akan ditahan (Terbooking) sampai Anda proses Lunasi atau Batalkan.'
        }
        submitLabel={booking ? 'Simpan Perubahan' : 'Simpan Booking'}
        successMessage={
          booking ? 'Perubahan booking tersimpan' : 'Booking tersimpan, unit sekarang berstatus Terbooking.'
        }
        disabled={!carId || hargaSepakat <= 0 || dpAmount <= 0 || dpAmount > hargaSepakat}
        onSubmit={() =>
          booking
            ? perbaruiBooking({
                id: booking.id,
                customer_id: customerId || null,
                sales_person_id: salesId || null,
                tanggal_booking: tanggal,
                harga_sepakat: hargaSepakat,
                dp_amount: dpAmount,
                metode_bayar: metode,
                catatan,
              })
            : buatBooking({
                car_id: carId,
                customer_id: customerId || null,
                sales_person_id: salesId || null,
                tanggal_booking: tanggal,
                harga_sepakat: hargaSepakat,
                dp_amount: dpAmount,
                metode_bayar: metode,
                catatan,
              })
        }
      >
        <div className="space-y-5 pb-2">
          {booking ? (
            <Field label="Unit Mobil">
              <div className="flex h-10 items-center rounded-[10px] border border-line bg-surface-alt px-3 text-body text-ink-muted">
                {booking.unit} {booking.no_polisi ? `· ${booking.no_polisi}` : ''}
              </div>
            </Field>
          ) : (
            <Field label="Unit Mobil" required htmlFor="booking-unit">
              <SearchableSelect
                id="booking-unit"
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
          )}

          <FormGrid>
            <Field label="Customer" htmlFor="booking-customer">
              <SearchableSelect
                id="booking-customer"
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

            <Field label="Salesman" hint="Kosongkan kalau tanpa salesman" htmlFor="booking-sales">
              <SearchableSelect
                id="booking-sales"
                options={[
                  { value: '', label: 'Tanpa Salesman' },
                  ...sales.map((s) => ({ value: s.id, label: s.nama })),
                ]}
                value={salesId}
                onChange={setSalesId}
                placeholder="Pilih salesman"
              />
            </Field>

            <Field label="Tanggal Booking" required htmlFor="tgl-booking">
              <Input
                id="tgl-booking"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </Field>

            <Field label="Metode Pembayaran DP" htmlFor="metode-booking">
              <Select value={metode} onValueChange={setMetode}>
                <SelectTrigger id="metode-booking">
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

            <Field label="Harga Sepakat" required hint="Harga jual final yang disepakati">
              <MoneyInput value={hargaSepakat} onChange={setHargaSepakat} />
            </Field>

            <Field
              label="DP Diterima"
              required
              hint={
                dpAmount > hargaSepakat
                  ? 'DP tidak boleh lebih besar dari harga sepakat'
                  : 'Uang muka yang sudah benar-benar diterima'
              }
            >
              <MoneyInput value={dpAmount} onChange={setDpAmount} />
            </Field>
          </FormGrid>

          {unit || booking ? (
            <div className="flex items-center justify-between rounded-lg bg-surface-alt px-4 py-3">
              <span className="text-label text-ink-muted">Sisa pelunasan</span>
              <Money
                value={Math.max(0, hargaSepakat - dpAmount)}
                size="lg"
                className="font-medium"
              />
            </div>
          ) : null}

          <Field label="Catatan" htmlFor="catatan-booking">
            <Textarea
              id="catatan-booking"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: pelunasan dijanjikan akhir bulan"
            />
          </Field>
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
          <Field label="Nama Customer" required htmlFor="nama-cust-booking">
            <Input
              id="nama-cust-booking"
              value={namaCustBaru}
              onChange={(e) => setNamaCustBaru(e.target.value)}
            />
          </Field>
          <Field label="No. Telepon" htmlFor="tlp-cust-booking">
            <Input
              id="tlp-cust-booking"
              value={tlpCustBaru}
              onChange={(e) => setTlpCustBaru(e.target.value)}
            />
          </Field>
        </div>
      </FormDialog>
    </>
  )
}
