'use client'

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Receipt, Trash2 } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/states'
import { Money } from '@/components/shared/money'
import { RowActions, type AksiBaris } from '@/components/shared/row-actions'
import { useConfirm } from '@/components/shared/confirm-dialog'
import { FormDialog, FormGrid, useAksi } from '@/components/forms/form-dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, MoneyInput, Textarea } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/select'
import { simpanOpex, hapusOpex } from '@/app/actions/master'
import { formatTanggal, todayJakarta } from '@/lib/format'
import { KATEGORI_OPEX } from '@/lib/constants'

export type Opex = {
  id: string
  tanggal: string
  kategori: string
  keterangan: string | null
  nominal: number
}

/**
 * Tabel biaya operasional (gaji, sewa, listrik, marketing) — biaya di luar
 * unit mobil. Dipakai di halaman Biaya Operasional dan Laporan Laba Rugi.
 */
export function OpexTable({
  rows,
  error,
  canWrite,
  pageSize = 10,
}: {
  rows: Opex[]
  error: string | null
  canWrite: boolean
  pageSize?: number
}) {
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Opex | null>(null)
  const { confirm, dialog } = useConfirm()
  const { jalankan } = useAksi()

  function bukaTambah() {
    setEditing(null)
    setOpen(true)
  }

  // Dipakai bareng di kolom aksi (desktop) & mobileCard supaya keduanya
  // selalu sinkron -- kartu mobile sempat lupa dikasih aksi sama sekali.
  const aksiUntuk = React.useCallback(
    (row: Opex): AksiBaris[] => [
      {
        label: 'Edit',
        icon: Pencil,
        onSelect: () => {
          setEditing(row)
          setOpen(true)
        },
      },
      {
        label: 'Hapus',
        icon: Trash2,
        tone: 'danger',
        onSelect: () =>
          confirm({
            title: 'Hapus biaya operasional ini?',
            description: `${row.kategori} — ${formatTanggal(row.tanggal)}`,
            confirmLabel: 'Ya, hapus',
            successMessage: 'Biaya operasional dihapus',
            onConfirm: async () => {
              const ok = await jalankan(() => hapusOpex(row.id))
              if (!ok) throw new Error('')
            },
          }),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const columns = React.useMemo<ColumnDef<Opex, any>[]>(
    () => [
      {
        accessorKey: 'tanggal',
        header: 'Tanggal',
        meta: { exportValue: (r: Opex) => r.tanggal },
        cell: ({ getValue }) => formatTanggal(getValue() as string),
      },
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
        accessorKey: 'keterangan',
        header: 'Keterangan',
        cell: ({ getValue }) => getValue() || <span className="text-ink-subtle">-</span>,
      },
      {
        accessorKey: 'nominal',
        header: 'Nominal',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} className="font-medium" />,
      },
      {
        id: 'aksi',
        header: '',
        enableSorting: false,
        meta: { align: 'right' as const },
        cell: ({ row }) => (canWrite ? <RowActions actions={aksiUntuk(row.original)} /> : null),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canWrite],
  )

  return (
    <>
      <DataTable<Opex>
        columns={columns}
        data={rows}
        searchKeys={['kategori', 'keterangan']}
        searchPlaceholder="Cari biaya operasional..."
        exportName="biaya-operasional"
        error={error}
        pageSize={pageSize}
        toolbarAction={
          canWrite ? (
            <Button onClick={bukaTambah}>
              <Plus />
              <span className="hidden sm:inline">Tambah Biaya</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          ) : null
        }
        empty={
          <EmptyState
            icon={Receipt}
            title="Belum ada biaya operasional"
            description="Catat gaji, sewa showroom, listrik, dan marketing di sini supaya laba bersih pengelola akurat."
            action={
              canWrite ? (
                <Button onClick={bukaTambah}>
                  <Plus />
                  Tambah Biaya
                </Button>
              ) : undefined
            }
          />
        }
        mobileCard={(row) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-ink">{row.kategori}</p>
              <p className="text-label text-ink-muted">
                {row.keterangan ?? '-'} · {formatTanggal(row.tanggal)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Money value={row.nominal} className="font-medium" />
              {canWrite ? <RowActions actions={aksiUntuk(row)} /> : null}
            </div>
          </div>
        )}
      />

      <OpexFormDialog open={open} onOpenChange={setOpen} opex={editing} />
      {dialog}
    </>
  )
}

function OpexFormDialog({
  open,
  onOpenChange,
  opex,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  opex: Opex | null
}) {
  const [tanggal, setTanggal] = React.useState(todayJakarta())
  const [kategori, setKategori] = React.useState('')
  const [keterangan, setKeterangan] = React.useState('')
  const [nominal, setNominal] = React.useState(0)

  React.useEffect(() => {
    if (!open) return
    setTanggal(opex?.tanggal ?? todayJakarta())
    setKategori(opex?.kategori ?? '')
    setKeterangan(opex?.keterangan ?? '')
    setNominal(opex?.nominal ?? 0)
  }, [open, opex])

  // Kategori bukan tabel master tersendiri (cuma kolom teks di
  // `operational_expenses`), jadi kategori custom yang sudah tersimpan tetap
  // disertakan supaya tetap terpilih & bisa dipakai lagi.
  const kategoriOptions = React.useMemo(() => {
    const daftar: string[] = [...KATEGORI_OPEX]
    if (kategori && !daftar.includes(kategori)) daftar.unshift(kategori)
    return daftar.map((k) => ({ value: k, label: k }))
  }, [kategori])

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={opex ? 'Edit Biaya Operasional' : 'Tambah Biaya Operasional'}
      description="Biaya di luar unit mobil: gaji, sewa showroom, listrik, marketing, dan lainnya."
      successMessage="Biaya operasional tersimpan"
      disabled={!kategori || nominal <= 0}
      onSubmit={() =>
        simpanOpex({
          ...(opex ? { id: opex.id } : {}),
          tanggal,
          kategori,
          keterangan,
          nominal,
        })
      }
    >
      <div className="space-y-4">
        <FormGrid>
          <Field label="Tanggal" required htmlFor="tgl-opex">
            <Input
              id="tgl-opex"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </Field>
          <Field label="Kategori" required htmlFor="kategori-opex">
            <SearchableSelect
              id="kategori-opex"
              options={kategoriOptions}
              value={kategori}
              onChange={setKategori}
              placeholder="Pilih kategori"
              searchPlaceholder="Cari atau ketik kategori baru..."
              creatable
              createLabel={(q) => `Tambahkan kategori "${q}"`}
            />
          </Field>
        </FormGrid>

        <Field label="Nominal" required>
          <MoneyInput value={nominal} onChange={setNominal} />
        </Field>

        <Field label="Keterangan" htmlFor="ket-opex">
          <Textarea
            id="ket-opex"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Contoh: gaji staf kantor Juli"
          />
        </Field>
      </div>
    </FormDialog>
  )
}
