'use client'

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Wallet } from 'lucide-react'
import { DataTable } from './data-table'
import { EmptyState } from './states'
import { Money } from './money'
import { formatTanggal } from '@/lib/format'
import { LEDGER_TYPE_LABEL, type LedgerType } from '@/lib/constants'
import type { InvestorLedger } from '@/types/database'

export type BarisMutasi = InvestorLedger & { saldo_setelah: number }

/** Hitung saldo berjalan — entri harus sudah urut tanggal menaik. */
export function hitungSaldoBerjalan(rows: InvestorLedger[]): BarisMutasi[] {
  let saldo = 0
  return rows.map((r) => {
    saldo += Number(r.amount)
    return { ...r, saldo_setelah: saldo }
  })
}

/**
 * Tabel mutasi saldo. Bahasa sengaja awam ("Mutasi Saldo", bukan "Ledger")
 * karena dipakai juga di dashboard investor.
 */
export function LedgerTable({
  rows,
  error,
  exportName = 'mutasi-saldo',
}: {
  rows: InvestorLedger[]
  error?: string | null
  exportName?: string
}) {
  const data = React.useMemo(() => hitungSaldoBerjalan(rows).slice().reverse(), [rows])

  const columns = React.useMemo<ColumnDef<BarisMutasi, any>[]>(
    () => [
      {
        accessorKey: 'tanggal',
        header: 'Tanggal',
        meta: { exportValue: (r: BarisMutasi) => r.tanggal },
        cell: ({ getValue }) => formatTanggal(getValue() as string),
      },
      {
        accessorKey: 'keterangan',
        header: 'Keterangan',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-ink">{row.original.keterangan}</p>
            <p className="text-label text-ink-subtle">
              {LEDGER_TYPE_LABEL[row.original.tipe as LedgerType] ?? row.original.tipe}
            </p>
          </div>
        ),
      },
      {
        id: 'masuk',
        header: 'Masuk',
        accessorFn: (r) => (r.amount > 0 ? r.amount : 0),
        meta: {
          align: 'right' as const,
          exportValue: (r: BarisMutasi) => (r.amount > 0 ? r.amount : ''),
        },
        cell: ({ row }) =>
          row.original.amount > 0 ? (
            <Money value={row.original.amount} className="text-success" />
          ) : (
            <span className="text-ink-subtle">-</span>
          ),
      },
      {
        id: 'keluar',
        header: 'Keluar',
        accessorFn: (r) => (r.amount < 0 ? -r.amount : 0),
        meta: {
          align: 'right' as const,
          exportValue: (r: BarisMutasi) => (r.amount < 0 ? -r.amount : ''),
        },
        cell: ({ row }) =>
          row.original.amount < 0 ? (
            <Money value={-row.original.amount} className="text-danger" />
          ) : (
            <span className="text-ink-subtle">-</span>
          ),
      },
      {
        accessorKey: 'saldo_setelah',
        header: 'Saldo Setelahnya',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} className="font-medium" />,
      },
    ],
    [],
  )

  return (
    <DataTable<BarisMutasi>
      columns={columns}
      data={data}
      searchKeys={['keterangan', 'tanggal']}
      searchPlaceholder="Cari keterangan mutasi..."
      exportName={exportName}
      error={error ?? null}
      empty={
        <EmptyState
          icon={Wallet}
          title="Belum ada mutasi saldo"
          description="Mutasi akan muncul setelah dana investasi dikonfirmasi masuk."
        />
      }
      mobileCard={(row) => (
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-body text-ink">{row.keterangan}</p>
            <Money value={row.amount} colored className="shrink-0 font-medium" />
          </div>
          <p className="text-label text-ink-muted">
            {formatTanggal(row.tanggal)} · Saldo setelahnya{' '}
            <Money value={row.saldo_setelah} className="text-ink" />
          </p>
        </div>
      )}
    />
  )
}
