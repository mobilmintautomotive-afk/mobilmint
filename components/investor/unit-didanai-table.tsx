'use client'

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Car } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/states'
import { Money } from '@/components/shared/money'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatPersen, formatTanggal } from '@/lib/format'

export type UnitDidanai = {
  car_id: string
  unit: string
  no_polisi: string | null
  status: string
  tanggal_beli: string | null
  porsi_modal: number
  porsi_pct: number
  bagi_hasil: number | null
  estimasi: boolean
}

/**
 * Tabel unit yang didanai investor. Sengaja tanpa link ke halaman internal
 * pengelola — investor hanya membaca.
 */
export function UnitDidanaiTable({ rows }: { rows: UnitDidanai[] }) {
  const columns = React.useMemo<ColumnDef<UnitDidanai, any>[]>(
    () => [
      {
        accessorKey: 'unit',
        header: 'Unit',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{row.original.unit}</p>
            <p className="text-label text-ink-muted">{row.original.no_polisi ?? '-'}</p>
          </div>
        ),
      },
      {
        accessorKey: 'porsi_modal',
        header: 'Porsi Modal Anda',
        meta: { align: 'right' as const },
        cell: ({ row }) => (
          <span>
            <Money value={row.original.porsi_modal} className="block" />
            <span className="text-label tnum text-ink-muted">
              {formatPersen(row.original.porsi_pct, 1)} dari unit
            </span>
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { align: 'center' as const },
        cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
      },
      {
        accessorKey: 'tanggal_beli',
        header: 'Tanggal Beli',
        meta: { exportValue: (r: UnitDidanai) => r.tanggal_beli ?? '' },
        cell: ({ getValue }) => formatTanggal(getValue() as string),
      },
      {
        accessorKey: 'bagi_hasil',
        header: 'Bagi Hasil',
        meta: {
          align: 'right' as const,
          exportValue: (r: UnitDidanai) => r.bagi_hasil ?? '',
        },
        cell: ({ row }) =>
          row.original.bagi_hasil === null ? (
            <span className="text-label text-ink-subtle">Belum cair</span>
          ) : (
            <Money value={row.original.bagi_hasil} colored className="font-medium" />
          ),
      },
    ],
    [],
  )

  return (
    <DataTable<UnitDidanai>
      columns={columns}
      data={rows}
      searchKeys={['unit', 'no_polisi']}
      searchPlaceholder="Cari mobil..."
      exportName="unit-yang-saya-danai"
      empty={
        <EmptyState
          icon={Car}
          title="Dana Anda belum dipakai beli mobil"
          description="Begitu pengelola membeli unit dengan dana Anda, mobilnya akan muncul di sini."
        />
      }
      mobileCard={(row) => (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{row.unit}</p>
              <p className="text-label text-ink-muted">{row.no_polisi ?? '-'}</p>
            </div>
            <StatusBadge status={row.status} />
          </div>
          <div className="flex items-center justify-between text-label">
            <span className="text-ink-muted">Porsi modal Anda</span>
            <Money value={row.porsi_modal} className="font-medium text-ink" />
          </div>
          <div className="flex items-center justify-between text-label">
            <span className="text-ink-muted">Bagi hasil</span>
            {row.bagi_hasil === null ? (
              <span className="text-ink-subtle">Belum cair</span>
            ) : (
              <Money value={row.bagi_hasil} colored className="font-medium" />
            )}
          </div>
        </div>
      )}
    />
  )
}
