'use client'

import * as React from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Car, Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/states'
import { Money } from '@/components/shared/money'
import { StatusBadge } from '@/components/shared/status-badge'
import { RowActions } from '@/components/shared/row-actions'
import { useConfirm } from '@/components/shared/confirm-dialog'
import { useAksi } from '@/components/forms/form-dialog'
import { Button } from '@/components/ui/button'
import { MobilFormDialog } from './mobil-form'
import { hapusMobil } from '@/app/actions/master'
import { CAR_STATUS, CAR_STATUS_LABEL, TRANSMISI_LABEL } from '@/lib/constants'
import { formatTanggal } from '@/lib/format'
import type { CarOverview } from '@/types/database'

export function MobilTable({
  rows,
  error,
  canWrite,
}: {
  rows: CarOverview[]
  error: string | null
  canWrite: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<CarOverview | null>(null)
  const [fStatus, setFStatus] = React.useState('semua')
  const [fMerek, setFMerek] = React.useState('semua')
  const [fTahun, setFTahun] = React.useState('semua')
  const { confirm, dialog } = useConfirm()
  const { jalankan } = useAksi()

  const merekOptions = React.useMemo(
    () => Array.from(new Set(rows.map((r) => r.merek))).sort().map((m) => ({ value: m, label: m })),
    [rows],
  )
  const tahunOptions = React.useMemo(
    () =>
      Array.from(new Set(rows.map((r) => String(r.tahun))))
        .sort((a, z) => Number(z) - Number(a))
        .map((t) => ({ value: t, label: t })),
    [rows],
  )

  const data = React.useMemo(
    () =>
      rows.filter(
        (r) =>
          (fStatus === 'semua' || r.status === fStatus) &&
          (fMerek === 'semua' || r.merek === fMerek) &&
          (fTahun === 'semua' || String(r.tahun) === fTahun),
      ),
    [rows, fStatus, fMerek, fTahun],
  )

  const columns = React.useMemo<ColumnDef<CarOverview, any>[]>(
    () => [
      {
        id: 'unit',
        header: 'Unit',
        accessorFn: (r) => `${r.merek} ${r.tipe}`,
        meta: { exportValue: (r: CarOverview) => `${r.merek} ${r.tipe} ${r.tahun}` },
        cell: ({ row }) => <UnitSel car={row.original} />,
      },
      {
        accessorKey: 'tahun',
        header: 'Tahun',
        meta: { align: 'center' as const },
      },
      {
        accessorKey: 'warna',
        header: 'Warna',
        cell: ({ getValue }) => getValue() || <span className="text-ink-subtle">-</span>,
      },
      {
        accessorKey: 'no_polisi',
        header: 'No. Polisi',
        cell: ({ getValue }) => getValue() || <span className="text-ink-subtle">-</span>,
      },
      {
        accessorKey: 'tanggal_pajak',
        header: 'Masa Pajak',
        meta: { exportValue: (r: CarOverview) => r.tanggal_pajak ?? '' },
        cell: ({ getValue }) => <MasaPajak tanggal={getValue() as string | null} />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: {
          align: 'center' as const,
          exportValue: (r: CarOverview) => CAR_STATUS_LABEL[r.status],
        },
        cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
      },
      {
        accessorKey: 'hpp',
        header: 'HPP',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} />,
      },
      {
        id: 'aksi',
        header: '',
        enableSorting: false,
        meta: { align: 'right' as const },
        cell: ({ row }) => (
          <RowActions
            actions={[
              { label: 'Lihat Detail', icon: Eye, href: `/master/mobil/${row.original.id}` },
              ...(canWrite
                ? [
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
                      disabled: Boolean(row.original.purchase_id),
                      alasan: 'Unit ini sudah punya transaksi pembelian',
                      onSelect: () =>
                        confirm({
                          title: 'Hapus unit ini?',
                          description: `${row.original.merek} ${row.original.tipe} ${row.original.tahun} akan dihapus permanen.`,
                          confirmLabel: 'Ya, hapus',
                          successMessage: 'Unit berhasil dihapus',
                          onConfirm: async () => {
                            const ok = await jalankan(() => hapusMobil(row.original.id))
                            if (!ok) throw new Error('')
                          },
                        }),
                    },
                  ]
                : []),
            ]}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canWrite],
  )

  return (
    <>
      <DataTable<CarOverview>
        columns={columns}
        data={data}
        searchKeys={['merek', 'tipe', 'no_polisi', 'warna', 'no_rangka']}
        searchPlaceholder="Cari merek, tipe, atau no. polisi..."
        exportName="master-mobil"
        error={error}
        filters={[
          {
            id: 'status',
            label: 'Status',
            value: fStatus,
            onChange: setFStatus,
            options: [
              { value: 'semua', label: 'Semua Status' },
              ...CAR_STATUS.map((s) => ({ value: s, label: CAR_STATUS_LABEL[s] })),
            ],
          },
          {
            id: 'merek',
            label: 'Merek',
            value: fMerek,
            onChange: setFMerek,
            options: [{ value: 'semua', label: 'Semua Merek' }, ...merekOptions],
          },
          {
            id: 'tahun',
            label: 'Tahun',
            value: fTahun,
            onChange: setFTahun,
            options: [{ value: 'semua', label: 'Semua Tahun' }, ...tahunOptions],
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
              <span className="hidden sm:inline">Tambah Mobil</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          ) : null
        }
        empty={
          <EmptyState
            icon={Car}
            title="Belum ada unit mobil"
            description="Tambahkan unit pertama, lalu catat pembeliannya di menu Transaksi > Pembelian."
            action={
              canWrite ? (
                <Button
                  onClick={() => {
                    setEditing(null)
                    setOpen(true)
                  }}
                >
                  <Plus />
                  Tambah Mobil
                </Button>
              ) : undefined
            }
          />
        }
        mobileCard={(row) => (
          <Link href={`/master/mobil/${row.id}`} className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="truncate font-medium text-ink">
                {row.merek} {row.tipe} {row.tahun}
              </p>
              <p className="text-label text-ink-muted">
                {row.no_polisi ?? 'Tanpa no. polisi'} · {TRANSMISI_LABEL[row.transmisi ?? ''] ?? '-'}
              </p>
              <p className="text-label text-ink-muted">
                HPP <Money value={row.hpp} className="font-medium text-ink" />
              </p>
            </div>
            <StatusBadge status={row.status} />
          </Link>
        )}
      />

      <MobilFormDialog open={open} onOpenChange={setOpen} mobil={editing} />
      {dialog}
    </>
  )
}

function UnitSel({ car }: { car: CarOverview }) {
  const foto = car.foto_urls?.[0]
  return (
    <Link href={`/master/mobil/${car.id}`} className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-neutral-soft">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="" className="size-full object-cover" />
        ) : (
          <Car className="size-4 text-ink-subtle" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium text-ink">
          {car.merek} {car.tipe}
        </span>
        <span className="block truncate text-label text-ink-muted">
          {TRANSMISI_LABEL[car.transmisi ?? ''] ?? 'Transmisi -'}
        </span>
      </span>
    </Link>
  )
}

function MasaPajak({ tanggal }: { tanggal: string | null }) {
  if (!tanggal) return <span className="text-ink-subtle">-</span>
  const lewat = new Date(`${tanggal}T00:00:00`) < new Date()
  return (
    <span className={lewat ? 'font-medium text-danger' : undefined}>
      {formatTanggal(tanggal)}
      {lewat ? ' (lewat)' : ''}
    </span>
  )
}
