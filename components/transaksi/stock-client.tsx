'use client'

import * as React from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Car, LayoutGrid, PackageCheck, Search, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { Money } from '@/components/shared/money'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatAngka, formatTanggal } from '@/lib/format'
import { TRANSMISI_LABEL } from '@/lib/constants'
import type { CarOverview } from '@/types/database'

const RENTANG_HPP = [
  { value: 'semua', label: 'Semua HPP' },
  { value: '0-100', label: '< Rp 100 jt' },
  { value: '100-200', label: 'Rp 100–200 jt' },
  { value: '200-999999', label: '> Rp 200 jt' },
]

const RENTANG_UMUR = [
  { value: 'semua', label: 'Semua Umur' },
  { value: '0-30', label: '< 30 hari' },
  { value: '30-60', label: '30–60 hari' },
  { value: '60-99999', label: '> 60 hari' },
]

/** Hanya status yang mungkin muncul di stok (unit terjual tidak ditarik). */
const STATUS_STOK = [
  { value: 'semua', label: 'Semua Status' },
  { value: 'READY_STOCK', label: 'Siap Dijual' },
  { value: 'PERBAIKAN', label: 'Proses Perbaikan' },
  { value: 'DIBELI', label: 'Baru Dibeli' },
  { value: 'TERBOOKING', label: 'Terbooking' },
]

export function StockClient({
  rows,
  error,
  ambangUmur,
  canWrite,
}: {
  rows: CarOverview[]
  error: string | null
  ambangUmur: number
  canWrite: boolean
}) {
  const [mode, setMode] = React.useState<'grid' | 'tabel'>('grid')
  const [q, setQ] = React.useState('')
  const [fMerek, setFMerek] = React.useState('semua')
  const [fHpp, setFHpp] = React.useState('semua')
  const [fUmur, setFUmur] = React.useState('semua')
  const [fStatus, setFStatus] = React.useState('semua')

  const merekOptions = React.useMemo(
    () => Array.from(new Set(rows.map((r) => r.merek))).sort(),
    [rows],
  )

  const data = React.useMemo(() => {
    return rows.filter((r) => {
      if (fStatus !== 'semua' && r.status !== fStatus) return false
      if (fMerek !== 'semua' && r.merek !== fMerek) return false
      if (q && !`${r.merek} ${r.tipe} ${r.no_polisi ?? ''}`.toLowerCase().includes(q.toLowerCase()))
        return false
      if (fHpp !== 'semua') {
        const [lo, hi] = fHpp.split('-').map(Number)
        const jt = r.hpp / 1_000_000
        if (jt < lo || jt >= hi) return false
      }
      if (fUmur !== 'semua') {
        const [lo, hi] = fUmur.split('-').map(Number)
        const u = r.umur_stok_hari ?? 0
        if (u < lo || u >= hi) return false
      }
      return true
    })
  }, [rows, q, fMerek, fHpp, fUmur, fStatus])

  const columns = React.useMemo<ColumnDef<CarOverview, any>[]>(
    () => [
      {
        id: 'unit',
        header: 'Unit',
        accessorFn: (r) => `${r.merek} ${r.tipe}`,
        cell: ({ row }) => (
          <Link href={`/master/mobil/${row.original.id}`} className="hover:text-accent">
            <span className="block font-medium">
              {row.original.merek} {row.original.tipe} {row.original.tahun}
            </span>
            <span className="block text-label text-ink-muted">{row.original.no_polisi ?? '-'}</span>
          </Link>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
      },
      {
        accessorKey: 'tanggal_beli',
        header: 'Tanggal Beli',
        meta: { exportValue: (r: CarOverview) => r.tanggal_beli ?? '' },
        cell: ({ getValue }) => formatTanggal(getValue() as string),
      },
      {
        accessorKey: 'umur_stok_hari',
        header: 'Umur Stok',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <UmurStok hari={getValue() as number} ambang={ambangUmur} />,
      },
      {
        accessorKey: 'modal_pembelian',
        header: 'Modal Beli',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} />,
      },
      {
        accessorKey: 'total_perbaikan',
        header: 'Perbaikan',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} />,
      },
      {
        accessorKey: 'hpp',
        header: 'HPP',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} className="font-medium" />,
      },
      {
        id: 'aksi',
        header: '',
        enableSorting: false,
        meta: { align: 'right' as const },
        cell: ({ row }) =>
          canWrite && row.original.status === 'READY_STOCK' ? (
            <Button asChild size="sm" variant="accent">
              <Link href={`/transaksi/penjualan?unit=${row.original.id}`}>Jual Unit Ini</Link>
            </Button>
          ) : null,
      },
    ],
    [ambangUmur, canWrite],
  )

  if (error) {
    return (
      <div className="mm-card">
        <ErrorState description={error} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari unit..."
              className="pl-9"
            />
          </div>

          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger className="sm:w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_STOK.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={fMerek} onValueChange={setFMerek}>
            <SelectTrigger className="sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Merek</SelectItem>
              {merekOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={fHpp} onValueChange={setFHpp}>
            <SelectTrigger className="sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RENTANG_HPP.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={fUmur} onValueChange={setFUmur}>
            <SelectTrigger className="sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RENTANG_UMUR.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 rounded-[10px] bg-neutral-soft p-1">
          <button
            type="button"
            onClick={() => setMode('grid')}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-label font-medium transition-colors',
              mode === 'grid' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted',
            )}
          >
            <LayoutGrid className="size-4" />
            Grid
          </button>
          <button
            type="button"
            onClick={() => setMode('tabel')}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-label font-medium transition-colors',
              mode === 'tabel' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted',
            )}
          >
            <Table2 className="size-4" />
            Tabel
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="mm-card">
          {rows.length === 0 ? (
            <EmptyState
              icon={PackageCheck}
              title="Belum ada unit di stok"
              description="Tambahkan pembelian pertama untuk mulai mengisi stok, lalu tandai unit siap jual setelah perbaikan selesai."
              action={
                canWrite ? (
                  <Button asChild>
                    <Link href="/transaksi/pembelian">Ke halaman Pembelian</Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <EmptyState
              icon={Search}
              title="Tidak ada unit yang cocok"
              description="Coba longgarkan filter atau kata kuncinya."
            />
          )}
        </div>
      ) : mode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <KartuStok key={c.id} car={c} ambang={ambangUmur} canWrite={canWrite} />
          ))}
        </div>
      ) : (
        <DataTable<CarOverview>
          columns={columns}
          data={data}
          searchKeys={['merek', 'tipe', 'no_polisi']}
          exportName="stock-unit"
        />
      )}
    </div>
  )
}

function KartuStok({
  car,
  ambang,
  canWrite,
}: {
  car: CarOverview
  ambang: number
  canWrite: boolean
}) {
  const foto = car.foto_urls?.[0]
  const umur = car.umur_stok_hari ?? 0
  const lama = umur > ambang

  return (
    <div className="mm-card flex flex-col gap-3 p-0 transition-shadow hover:shadow-lg">
      <Link href={`/master/mobil/${car.id}`} className="block">
        <div className="aspect-[16/10] w-full overflow-hidden rounded-t-lg bg-neutral-soft">
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto} alt={car.merek} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center">
              <Car className="size-10 text-ink-subtle" strokeWidth={1.5} />
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 px-5 pb-5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <Link href={`/master/mobil/${car.id}`} className="hover:text-accent">
              <h3 className="text-card-title text-ink">
                {car.merek} {car.tipe} {car.tahun}
              </h3>
            </Link>
            <StatusBadge status={car.status} />
          </div>
          <p className="text-label text-ink-muted">
            {car.no_polisi ?? 'Tanpa no. polisi'} ·{' '}
            {TRANSMISI_LABEL[car.transmisi ?? ''] ?? 'Transmisi -'} ·{' '}
            {formatAngka(car.kilometer ?? 0)} km
          </p>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="mm-label-caps">HPP</p>
            <Money value={car.hpp} size="lg" className="mt-0.5 block" />
          </div>
          <div className="text-right">
            <p className="mm-label-caps">Umur stok</p>
            <p className={cn('mt-0.5 font-semibold tnum', lama ? 'text-danger' : 'text-ink')}>
              {umur} hari
            </p>
          </div>
        </div>

        {lama ? (
          <p className="rounded-[10px] bg-danger-soft px-3 py-2 text-label text-danger">
            Sudah lebih dari {ambang} hari di stok. Pertimbangkan turunkan harga atau dorong sales.
          </p>
        ) : null}

        {canWrite ? (
          car.status === 'READY_STOCK' ? (
            <Button asChild variant="accent" className="mt-auto w-full">
              <Link href={`/transaksi/penjualan?unit=${car.id}`}>Jual Unit Ini</Link>
            </Button>
          ) : (
            <Button asChild variant="secondary" className="mt-auto w-full">
              <Link href={`/master/mobil/${car.id}`}>Lihat Detail Unit</Link>
            </Button>
          )
        ) : null}
      </div>
    </div>
  )
}

function UmurStok({ hari, ambang }: { hari: number | null; ambang: number }) {
  if (hari === null) return <span className="text-ink-subtle">-</span>
  return (
    <span className={cn('tnum', hari > ambang && 'font-medium text-danger')}>{hari} hari</span>
  )
}
