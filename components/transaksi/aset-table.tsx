'use client'

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Boxes, Pencil, Plus, Trash2 } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/states'
import { Money } from '@/components/shared/money'
import { RowActions } from '@/components/shared/row-actions'
import { useConfirm } from '@/components/shared/confirm-dialog'
import { FormDialog, FormGrid, useAksi } from '@/components/forms/form-dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, MoneyInput, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { simpanAset, hapusAset } from '@/app/actions/master'
import { formatTanggal, todayJakarta } from '@/lib/format'
import { KATEGORI_ASET } from '@/lib/constants'
import type { Aset } from '@/lib/queries/assets'

export function AsetTable({
  rows,
  error,
  canWrite,
}: {
  rows: Aset[]
  error: string | null
  canWrite: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Aset | null>(null)
  const { confirm, dialog } = useConfirm()
  const { jalankan } = useAksi()

  function bukaTambah() {
    setEditing(null)
    setOpen(true)
  }

  const columns = React.useMemo<ColumnDef<Aset, any>[]>(
    () => [
      { accessorKey: 'nama', header: 'Nama Aset' },
      {
        accessorKey: 'kategori',
        header: 'Kategori',
        cell: ({ getValue }) => (
          <span className="inline-flex items-center rounded-full bg-neutral-soft px-2.5 py-1 text-[12px] font-medium text-ink-muted">
            {String(getValue())}
          </span>
        ),
      },
      {
        accessorKey: 'tanggal_beli',
        header: 'Tanggal Beli',
        meta: { exportValue: (r: Aset) => r.tanggal_beli },
        cell: ({ getValue }) => formatTanggal(getValue() as string),
      },
      {
        accessorKey: 'harga_beli',
        header: 'Harga Beli',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} />,
      },
      {
        accessorKey: 'akumulasi_penyusutan',
        header: 'Penyusutan',
        meta: { align: 'right' as const },
        cell: ({ getValue }) =>
          (getValue() as number) > 0 ? (
            <Money value={-(getValue() as number)} className="text-ink-muted" />
          ) : (
            <span className="text-ink-subtle">-</span>
          ),
      },
      {
        accessorKey: 'nilai_buku',
        header: 'Nilai Buku',
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
                  tone: 'danger',
                  onSelect: () =>
                    confirm({
                      title: 'Hapus aset ini?',
                      description: `${row.original.nama} akan dihapus permanen dari daftar aset.`,
                      confirmLabel: 'Ya, hapus',
                      successMessage: 'Aset dihapus',
                      onConfirm: async () => {
                        const ok = await jalankan(() => hapusAset(row.original.id))
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
      <DataTable<Aset>
        columns={columns}
        data={rows}
        searchKeys={['nama', 'kategori', 'catatan']}
        searchPlaceholder="Cari aset..."
        exportName="aset-perusahaan"
        error={error}
        toolbarAction={
          canWrite ? (
            <Button onClick={bukaTambah}>
              <Plus />
              <span className="hidden sm:inline">Tambah Aset</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          ) : null
        }
        empty={
          <EmptyState
            icon={Boxes}
            title="Belum ada aset tercatat"
            description="Catat aset perusahaan seperti komputer, furnitur, atau kendaraan operasional di sini. Tidak memotong saldo investor."
            action={
              canWrite ? (
                <Button onClick={bukaTambah}>
                  <Plus />
                  Tambah Aset
                </Button>
              ) : undefined
            }
          />
        }
        mobileCard={(row) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-ink">{row.nama}</p>
              <p className="text-label text-ink-muted">
                {row.kategori} · {formatTanggal(row.tanggal_beli)}
              </p>
            </div>
            <Money value={row.nilai_buku} className="shrink-0 font-medium" />
          </div>
        )}
      />

      <AsetFormDialog open={open} onOpenChange={setOpen} aset={editing} />
      {dialog}
    </>
  )
}

function AsetFormDialog({
  open,
  onOpenChange,
  aset,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  aset: Aset | null
}) {
  const [nama, setNama] = React.useState('')
  const [kategori, setKategori] = React.useState('')
  const [tanggal, setTanggal] = React.useState(todayJakarta())
  const [hargaBeli, setHargaBeli] = React.useState(0)
  const [umurManfaat, setUmurManfaat] = React.useState('')
  const [nilaiResidu, setNilaiResidu] = React.useState(0)
  const [catatan, setCatatan] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setNama(aset?.nama ?? '')
    setKategori(aset?.kategori ?? '')
    setTanggal(aset?.tanggal_beli ?? todayJakarta())
    setHargaBeli(aset?.harga_beli ?? 0)
    setUmurManfaat(aset?.umur_manfaat_bulan != null ? String(aset.umur_manfaat_bulan) : '')
    setNilaiResidu(aset?.nilai_residu ?? 0)
    setCatatan(aset?.catatan ?? '')
  }, [open, aset])

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={aset ? 'Edit Aset' : 'Tambah Aset Perusahaan'}
      description="Dicatat sebagai milik pengelola — tidak memotong saldo investor."
      successMessage="Aset tersimpan"
      disabled={!nama || !kategori || hargaBeli <= 0}
      onSubmit={() =>
        simpanAset({
          ...(aset ? { id: aset.id } : {}),
          nama,
          kategori,
          tanggal_beli: tanggal,
          harga_beli: hargaBeli,
          umur_manfaat_bulan: umurManfaat === '' ? null : Number(umurManfaat),
          nilai_residu: nilaiResidu,
          catatan,
        })
      }
    >
      <div className="space-y-4">
        <Field label="Nama Aset" required htmlFor="nama-aset">
          <Input
            id="nama-aset"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Contoh: Laptop kasir, AC showroom"
          />
        </Field>

        <FormGrid>
          <Field label="Kategori" required htmlFor="kategori-aset">
            <Select value={kategori} onValueChange={setKategori}>
              <SelectTrigger id="kategori-aset">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {KATEGORI_ASET.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Tanggal Beli" required htmlFor="tgl-aset">
            <Input
              id="tgl-aset"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </Field>

          <Field label="Harga Beli" required>
            <MoneyInput value={hargaBeli} onChange={setHargaBeli} />
          </Field>

          <Field
            label="Umur Manfaat (bulan)"
            hint="Kosongkan kalau tidak ingin disusutkan"
            htmlFor="umur-aset"
          >
            <Input
              id="umur-aset"
              type="number"
              value={umurManfaat}
              onChange={(e) => setUmurManfaat(e.target.value)}
              placeholder="36"
            />
          </Field>
        </FormGrid>

        {umurManfaat !== '' ? (
          <Field label="Nilai Residu" hint="Perkiraan nilai sisa setelah disusutkan penuh">
            <MoneyInput value={nilaiResidu} onChange={setNilaiResidu} />
          </Field>
        ) : null}

        <Field label="Catatan" htmlFor="catatan-aset">
          <Textarea
            id="catatan-aset"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Kondisi, lokasi, nomor seri, dll."
          />
        </Field>
      </div>
    </FormDialog>
  )
}
