'use client'

import * as React from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PAGE_SIZE } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, ErrorState, TableSkeleton } from './states'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: 'left' | 'right' | 'center'
    /** Nilai yang dipakai saat Export CSV. Default: nilai sel apa adanya. */
    exportValue?: (row: TData) => string | number | null | undefined
    /** Sembunyikan kolom di layar kecil (mobile pakai tampilan kartu). */
    hideOnMobile?: boolean
  }
}

export type TableFilter = {
  id: string
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

export type DataTableProps<T> = {
  columns: ColumnDef<T, any>[]
  data: T[]
  /** Kolom yang ikut dicari lewat search box. */
  searchKeys?: (keyof T | string)[]
  searchPlaceholder?: string
  filters?: TableFilter[]
  toolbarAction?: React.ReactNode
  /** Nama file export, tanpa ekstensi. */
  exportName?: string
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  empty?: React.ReactNode
  /** Render satu baris sebagai kartu di mobile (<768px). */
  mobileCard?: (row: T) => React.ReactNode
  onRowClick?: (row: T) => void
  pageSize?: number
  /** Catatan kecil di footer, mis. peringatan data dipotong. */
  footNote?: React.ReactNode
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchKeys,
  searchPlaceholder = 'Cari...',
  filters,
  toolbarAction,
  exportName = 'data',
  loading,
  error,
  onRetry,
  empty,
  mobileCard,
  onRowClick,
  pageSize = PAGE_SIZE,
  footNote,
}: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [q, setQ] = React.useState('')

  const filtered = React.useMemo(() => {
    if (!q.trim()) return data
    const needle = q.toLowerCase()
    const keys = searchKeys && searchKeys.length > 0 ? searchKeys : null
    return data.filter((row) => {
      const values = keys ? keys.map((k) => row[k as string]) : Object.values(row)
      return values.some((v) => v != null && String(v).toLowerCase().includes(needle))
    })
  }, [data, q, searchKeys])

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })

  function exportCSV() {
    const cols = table.getVisibleFlatColumns().filter((c) => c.id !== 'aksi')
    const header = cols.map((c) => csvCell(headerText(c.columnDef.header)))
    const rows = table.getSortedRowModel().rows.map((r) =>
      cols
        .map((c) => {
          const meta = c.columnDef.meta
          const val = meta?.exportValue
            ? meta.exportValue(r.original)
            : r.getValue(c.id)
          return csvCell(val)
        })
        .join(','),
    )
    const csv = '﻿' + [header.join(','), ...rows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportName}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const total = filtered.length
  const { pageIndex } = table.getState().pagination
  const from = total === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, total)

  return (
    <div className="rounded-lg bg-surface shadow">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                table.setPageIndex(0)
              }}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>

          {filters?.map((f) => (
            <Select
              key={f.id}
              value={f.value}
              onValueChange={(v) => {
                f.onChange(v)
                table.setPageIndex(0)
              }}
            >
              <SelectTrigger className="sm:w-[170px]">
                <SelectValue placeholder={f.label} />
              </SelectTrigger>
              <SelectContent>
                {f.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md" onClick={exportCSV} disabled={total === 0}>
            <Download />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          {toolbarAction}
        </div>
      </div>

      {/* Body — 4 state */}
      {loading ? (
        <TableSkeleton cols={Math.min(columns.length, 6)} />
      ) : error ? (
        <ErrorState
          description={error}
          action={
            onRetry ? (
              <Button variant="secondary" onClick={onRetry}>
                Coba lagi
              </Button>
            ) : undefined
          }
        />
      ) : total === 0 ? (
        (empty ?? (
          <EmptyState
            title={q ? 'Tidak ada hasil' : 'Belum ada data'}
            description={
              q
                ? `Tidak ditemukan data yang cocok dengan "${q}". Coba kata kunci lain.`
                : 'Data akan muncul di sini setelah ditambahkan.'
            }
          />
        ))
      ) : (
        <>
          {/* Desktop & tablet: tabel */}
          <div className={cn('mm-scroll overflow-x-auto', mobileCard && 'hidden md:block')}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="bg-surface-alt">
                    {hg.headers.map((h) => {
                      const align = h.column.columnDef.meta?.align ?? 'left'
                      const canSort = h.column.getCanSort()
                      return (
                        <th
                          key={h.id}
                          className={cn(
                            'whitespace-nowrap px-4 py-3 text-caps uppercase text-ink-subtle',
                            align === 'right' && 'text-right',
                            align === 'center' && 'text-center',
                            align === 'left' && 'text-left',
                          )}
                        >
                          {h.isPlaceholder ? null : canSort ? (
                            <button
                              type="button"
                              onClick={h.column.getToggleSortingHandler()}
                              className={cn(
                                'inline-flex items-center gap-1 transition-colors hover:text-ink-muted',
                                align === 'right' && 'flex-row-reverse',
                              )}
                            >
                              {flexRender(h.column.columnDef.header, h.getContext())}
                              <ArrowUpDown className="size-3" />
                            </button>
                          ) : (
                            flexRender(h.column.columnDef.header, h.getContext())
                          )}
                        </th>
                      )
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={cn(
                      'border-t border-line transition-colors hover:bg-surface-alt',
                      onRowClick && 'cursor-pointer',
                    )}
                    style={{ height: 52 }}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const align = cell.column.columnDef.meta?.align ?? 'left'
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            'px-4 py-2 text-body text-ink',
                            align === 'right' && 'text-right tnum',
                            align === 'center' && 'text-center',
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: daftar kartu */}
          {mobileCard ? (
            <div className="divide-y divide-line md:hidden">
              {table.getRowModel().rows.map((row) => (
                <div key={row.id} className="p-4">
                  {mobileCard(row.original)}
                </div>
              ))}
            </div>
          ) : null}

          {/* Footer */}
          <div className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-label text-ink-muted">
              Menampilkan {from}–{to} dari {total} data
              {footNote ? <span className="ml-2 text-ink-subtle">{footNote}</span> : null}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft />
                Sebelumnya
              </Button>
              <span className="text-label tnum text-ink-muted">
                {pageIndex + 1} / {table.getPageCount()}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Berikutnya
                <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function headerText(header: unknown): string {
  if (typeof header === 'string') return header
  return ''
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
