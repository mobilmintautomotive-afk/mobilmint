'use client'

import * as React from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle2, Pencil, Plus, Trash2, Wrench } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/states'
import { Money } from '@/components/shared/money'
import { StatusBadge } from '@/components/shared/status-badge'
import { RowActions } from '@/components/shared/row-actions'
import { useConfirm } from '@/components/shared/confirm-dialog'
import { FormDialog, FormGrid, useAksi } from '@/components/forms/form-dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, MoneyInput, Textarea } from '@/components/ui/input'
import { SearchableSelect, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/primitives'
import { simpanPerbaikan, hapusPerbaikan, selesaikanPerbaikan } from '@/app/actions/repairs'
import { formatTanggal, todayJakarta } from '@/lib/format'
import { JENIS_PERBAIKAN, REPAIR_STATUS_LABEL, VENDOR_TYPE_LABEL } from '@/lib/constants'

type Perbaikan = {
  id: string
  car_id: string
  unit: string
  vendor_id: string | null
  vendor_nama: string
  jenis_perbaikan: string
  deskripsi: string | null
  biaya: number
  tanggal_masuk: string
  tanggal_selesai: string | null
  status: string
  ambil_dari_modal: boolean
}

type UnitOption = {
  id: string
  label: string
  no_polisi: string | null
  status: string
  hpp: number
}

export function PerbaikanClient({
  rows,
  error,
  canWrite,
  units,
  vendors,
}: {
  rows: Perbaikan[]
  error: string | null
  canWrite: boolean
  units: UnitOption[]
  vendors: { id: string; nama: string; tipe_vendor: string }[]
}) {
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Perbaikan | null>(null)
  const [fStatus, setFStatus] = React.useState('semua')
  const { confirm, dialog } = useConfirm()
  const { jalankan } = useAksi()

  const data = React.useMemo(
    () => (fStatus === 'semua' ? rows : rows.filter((r) => r.status === fStatus)),
    [rows, fStatus],
  )

  const columns = React.useMemo<ColumnDef<Perbaikan, any>[]>(
    () => [
      {
        accessorKey: 'tanggal_masuk',
        header: 'Tanggal Masuk',
        meta: { exportValue: (r: Perbaikan) => r.tanggal_masuk },
        cell: ({ getValue }) => formatTanggal(getValue() as string),
      },
      {
        accessorKey: 'unit',
        header: 'Unit',
        cell: ({ row }) => (
          <Link href={`/master/mobil/${row.original.car_id}`} className="hover:text-accent">
            {row.original.unit}
          </Link>
        ),
      },
      { accessorKey: 'vendor_nama', header: 'Vendor' },
      { accessorKey: 'jenis_perbaikan', header: 'Jenis' },
      {
        accessorKey: 'biaya',
        header: 'Biaya',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: {
          align: 'center' as const,
          exportValue: (r: Perbaikan) =>
            REPAIR_STATUS_LABEL[r.status as keyof typeof REPAIR_STATUS_LABEL],
        },
        cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
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
                ...(row.original.status === 'PROSES'
                  ? [
                      {
                        label: 'Tandai Selesai',
                        icon: CheckCircle2,
                        onSelect: () =>
                          jalankan(() => selesaikanPerbaikan(row.original.id, todayJakarta()), {
                            sukses: 'Perbaikan ditandai selesai',
                          }),
                      },
                    ]
                  : []),
                {
                  label: 'Edit',
                  icon: Pencil,
                  onSelect: () => {
                    setEditing(row.original)
                    setOpen(true)
                  },
                },
                {
                  label: 'Hapus',
                  icon: Trash2,
                  tone: 'danger' as const,
                  disabled: row.original.ambil_dari_modal,
                  alasan: 'Perbaikan ini sudah memotong saldo investor',
                  onSelect: () =>
                    confirm({
                      title: 'Hapus data perbaikan?',
                      description: `Perbaikan ${row.original.jenis_perbaikan} pada ${row.original.unit} akan dihapus dan HPP unit ikut berkurang.`,
                      confirmLabel: 'Ya, hapus',
                      successMessage: 'Data perbaikan dihapus',
                      onConfirm: async () => {
                        const ok = await jalankan(() => hapusPerbaikan(row.original.id))
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
      <DataTable<Perbaikan>
        columns={columns}
        data={data}
        searchKeys={['unit', 'vendor_nama', 'jenis_perbaikan', 'deskripsi']}
        searchPlaceholder="Cari unit, vendor, atau jenis perbaikan..."
        exportName="perbaikan"
        error={error}
        filters={[
          {
            id: 'status',
            label: 'Status',
            value: fStatus,
            onChange: setFStatus,
            options: [
              { value: 'semua', label: 'Semua Status' },
              { value: 'PROSES', label: 'Proses' },
              { value: 'SELESAI', label: 'Selesai' },
            ],
          },
        ]}
        toolbarAction={
          canWrite ? (
            <Button
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <Plus />
              <span className="hidden sm:inline">Perbaikan Baru</span>
              <span className="sm:hidden">Baru</span>
            </Button>
          ) : null
        }
        empty={
          <EmptyState
            icon={Wrench}
            title="Belum ada perbaikan"
            description="Catat biaya bengkel dan salon di sini supaya HPP unit selalu akurat."
            action={
              canWrite ? (
                <Button
                  onClick={() => {
                    setEditing(null)
                    setOpen(true)
                  }}
                >
                  <Plus />
                  Perbaikan Baru
                </Button>
              ) : undefined
            }
          />
        }
        mobileCard={(row) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{row.unit}</p>
                <p className="text-label text-ink-muted">
                  {row.jenis_perbaikan} · {row.vendor_nama}
                </p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-label text-ink-muted">{formatTanggal(row.tanggal_masuk)}</span>
              <Money value={row.biaya} className="font-medium" />
            </div>
          </div>
        )}
      />

      <PerbaikanFormDialog
        open={open}
        onOpenChange={setOpen}
        perbaikan={editing}
        units={units}
        vendors={vendors}
      />
      {dialog}
    </>
  )
}

function PerbaikanFormDialog({
  open,
  onOpenChange,
  perbaikan,
  units,
  vendors,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  perbaikan: Perbaikan | null
  units: UnitOption[]
  vendors: { id: string; nama: string; tipe_vendor: string }[]
}) {
  const [carId, setCarId] = React.useState('')
  const [vendorId, setVendorId] = React.useState('')
  const [jenis, setJenis] = React.useState('')
  const [deskripsi, setDeskripsi] = React.useState('')
  const [biaya, setBiaya] = React.useState(0)
  const [masuk, setMasuk] = React.useState(todayJakarta())
  const [selesai, setSelesai] = React.useState('')
  const [status, setStatus] = React.useState('PROSES')
  const [dariModal, setDariModal] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setCarId(perbaikan?.car_id ?? '')
    setVendorId(perbaikan?.vendor_id ?? '')
    setJenis(perbaikan?.jenis_perbaikan ?? '')
    setDeskripsi(perbaikan?.deskripsi ?? '')
    setBiaya(perbaikan?.biaya ?? 0)
    setMasuk(perbaikan?.tanggal_masuk ?? todayJakarta())
    setSelesai(perbaikan?.tanggal_selesai ?? '')
    setStatus(perbaikan?.status ?? 'PROSES')
    setDariModal(perbaikan?.ambil_dari_modal ?? false)
  }, [open, perbaikan])

  const unit = units.find((u) => u.id === carId)

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={perbaikan ? 'Edit Perbaikan' : 'Perbaikan Baru'}
      description="Biaya ini otomatis masuk ke HPP unit."
      successMessage="Data perbaikan tersimpan"
      disabled={!carId || !jenis}
      onSubmit={() =>
        simpanPerbaikan({
          ...(perbaikan ? { id: perbaikan.id } : {}),
          car_id: carId,
          vendor_id: vendorId || null,
          jenis_perbaikan: jenis,
          deskripsi,
          biaya,
          tanggal_masuk: masuk,
          tanggal_selesai: selesai || null,
          status,
          ambil_dari_modal: dariModal,
        })
      }
    >
      <div className="space-y-4">
        <Field label="Unit Mobil" required htmlFor="perbaikan-unit">
          <SearchableSelect
            id="perbaikan-unit"
            options={units.map((u) => ({
              value: u.id,
              label: u.label,
              keterangan: `${u.no_polisi ?? 'Tanpa no. polisi'}`,
            }))}
            value={carId}
            onChange={setCarId}
            placeholder="Pilih unit"
            emptyText="Tidak ada unit yang bisa diperbaiki"
            disabled={Boolean(perbaikan)}
          />
        </Field>

        {unit ? (
          <div className="flex items-center justify-between rounded-lg bg-surface-alt px-4 py-3">
            <span className="text-label text-ink-muted">HPP unit saat ini</span>
            <Money value={unit.hpp} className="font-medium" />
          </div>
        ) : null}

        <FormGrid>
          <Field label="Vendor" htmlFor="perbaikan-vendor">
            <SearchableSelect
              id="perbaikan-vendor"
              options={vendors.map((v) => ({
                value: v.id,
                label: v.nama,
                keterangan: VENDOR_TYPE_LABEL[v.tipe_vendor as keyof typeof VENDOR_TYPE_LABEL],
              }))}
              value={vendorId}
              onChange={setVendorId}
              placeholder="Pilih vendor"
            />
          </Field>

          <Field label="Jenis Perbaikan" required htmlFor="perbaikan-jenis">
            <Select value={jenis} onValueChange={setJenis}>
              <SelectTrigger id="perbaikan-jenis">
                <SelectValue placeholder="Pilih jenis" />
              </SelectTrigger>
              <SelectContent>
                {JENIS_PERBAIKAN.map((j) => (
                  <SelectItem key={j} value={j}>
                    {j}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Biaya" required>
            <MoneyInput value={biaya} onChange={setBiaya} />
          </Field>

          <Field label="Status" htmlFor="perbaikan-status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="perbaikan-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PROSES">Proses</SelectItem>
                <SelectItem value="SELESAI">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Tanggal Masuk" required htmlFor="tgl-masuk">
            <Input
              id="tgl-masuk"
              type="date"
              value={masuk}
              onChange={(e) => setMasuk(e.target.value)}
            />
          </Field>

          <Field label="Tanggal Selesai" htmlFor="tgl-selesai">
            <Input
              id="tgl-selesai"
              type="date"
              value={selesai}
              onChange={(e) => setSelesai(e.target.value)}
            />
          </Field>
        </FormGrid>

        <Field label="Deskripsi" htmlFor="perbaikan-deskripsi">
          <Textarea
            id="perbaikan-deskripsi"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            placeholder="Contoh: ganti timing belt, tune up, ganti oli"
          />
        </Field>

        {!perbaikan ? (
          <div className="flex items-start justify-between gap-4 rounded-lg border border-line p-3">
            <div>
              <p className="text-label font-medium text-ink">Ambil dari modal investor</p>
              <p className="text-label text-ink-muted">
                Kalau dicentang, biaya ini memotong saldo investor secara proporsional sesuai porsi
                pendanaan unit. Kalau tidak, biaya dianggap dari kas operasional dan hanya menambah
                HPP.
              </p>
            </div>
            <Switch checked={dariModal} onCheckedChange={setDariModal} />
          </div>
        ) : null}
      </div>
    </FormDialog>
  )
}
