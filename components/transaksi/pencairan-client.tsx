'use client'

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Banknote, CheckCheck, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { Money } from '@/components/shared/money'
import { FormDialog } from '@/components/forms/form-dialog'
import { DokumenUpload } from '@/components/forms/dokumen-upload'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/primitives'
import { prosesPencairan } from '@/app/actions/profit-sharing'
import { getSignedUrlDokumen } from '@/app/actions/upload'
import { formatPersen, formatTanggal, todayJakarta } from '@/lib/format'
import { errorMessage } from '@/lib/utils'

type BarisPencairan = {
  id: string
  investor_id: string
  investor_nama: string
  modal_awal: number
  porsi_pct: number
  bagi_hasil: number
  sudah_ditransfer: boolean
  tanggal_dicairkan: string | null
  bukti_transfer_url: string | null
  no_transaksi_bagi_hasil: string
  no_transaksi_jual: string
  tanggal_jual: string | null
  tanggal_proses: string | null
  unit: string
  no_polisi: string | null
}

export function PencairanClient({
  rows,
  error,
  canWrite,
}: {
  rows: BarisPencairan[]
  error: string | null
  canWrite: boolean
}) {
  const [proses, setProses] = React.useState<BarisPencairan | null>(null)

  const belumCair = React.useMemo(() => rows.filter((r) => !r.sudah_ditransfer), [rows])
  const sudahCair = React.useMemo(() => rows.filter((r) => r.sudah_ditransfer), [rows])

  if (error) {
    return (
      <div className="mm-card">
        <ErrorState description={error} />
      </div>
    )
  }

  return (
    <>
      <Tabs defaultValue="belum">
        <TabsList>
          <TabsTrigger value="belum">
            Menunggu Dicairkan
            {belumCair.length > 0 ? (
              <span className="ml-1 rounded-full bg-warning-soft px-1.5 py-0.5 text-[11px] font-semibold text-warning-deep">
                {belumCair.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat Pencairan</TabsTrigger>
        </TabsList>

        <TabsContent value="belum">
          <TabBelumCair rows={belumCair} canWrite={canWrite} onProses={setProses} />
        </TabsContent>

        <TabsContent value="riwayat">
          <TabRiwayat rows={sudahCair} />
        </TabsContent>
      </Tabs>

      {proses ? (
        <DialogProsesPencairan baris={proses} open onOpenChange={(v) => !v && setProses(null)} />
      ) : null}
    </>
  )
}

/* --------------------------- Menunggu dicairkan -------------------------- */

function TabBelumCair({
  rows,
  canWrite,
  onProses,
}: {
  rows: BarisPencairan[]
  canWrite: boolean
  onProses: (r: BarisPencairan) => void
}) {
  const columns = React.useMemo<ColumnDef<BarisPencairan, any>[]>(
    () => [
      {
        accessorKey: 'unit',
        header: 'Unit',
        cell: ({ row }) => (
          <div>
            <span className="block font-medium">{row.original.unit}</span>
            <span className="block text-label text-ink-muted">
              {row.original.no_polisi ?? '-'} · {row.original.no_transaksi_jual}
            </span>
          </div>
        ),
      },
      { accessorKey: 'investor_nama', header: 'Investor' },
      {
        accessorKey: 'tanggal_jual',
        header: 'Tanggal Jual',
        meta: { exportValue: (r: BarisPencairan) => r.tanggal_jual ?? '' },
        cell: ({ getValue }) => (getValue() ? formatTanggal(getValue() as string) : '-'),
      },
      {
        accessorKey: 'porsi_pct',
        header: 'Porsi Modal',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <span className="tnum">{formatPersen(getValue() as number, 1)}</span>,
      },
      {
        accessorKey: 'bagi_hasil',
        header: 'Margin (Bagi Hasil)',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} colored className="font-medium" />,
      },
      {
        id: 'aksi',
        header: '',
        enableSorting: false,
        meta: { align: 'right' as const },
        cell: ({ row }) =>
          canWrite && row.original.bagi_hasil > 0 ? (
            <Button size="sm" variant="accent" onClick={() => onProses(row.original)}>
              <Banknote />
              <span className="hidden lg:inline">Proses Pencairan</span>
              <span className="lg:hidden">Cairkan</span>
            </Button>
          ) : (
            <span className="text-label text-ink-subtle">Tidak ada margin</span>
          ),
      },
    ],
    [canWrite, onProses],
  )

  return (
    <DataTable<BarisPencairan>
      columns={columns}
      data={rows}
      searchKeys={['unit', 'investor_nama', 'no_transaksi_jual', 'no_polisi']}
      searchPlaceholder="Cari unit atau nama investor..."
      exportName="menunggu-pencairan"
      empty={
        <EmptyState
          icon={CheckCheck}
          title="Semua sudah dicairkan"
          description="Tidak ada dana bagi hasil yang menunggu pencairan. Kerja bagus!"
        />
      }
      mobileCard={(row) => (
        <div className="space-y-2">
          <div>
            <p className="font-medium text-ink">{row.investor_nama}</p>
            <p className="text-label text-ink-muted">
              {row.unit} · {row.tanggal_jual ? formatTanggal(row.tanggal_jual) : '-'}
            </p>
          </div>
          <div className="flex items-center justify-between text-label">
            <span className="text-ink-muted">Margin bagi hasil</span>
            <Money value={row.bagi_hasil} colored className="font-medium" />
          </div>
          {canWrite && row.bagi_hasil > 0 ? (
            <Button size="sm" variant="accent" className="w-full" onClick={() => onProses(row)}>
              <Banknote />
              Proses Pencairan
            </Button>
          ) : null}
        </div>
      )}
    />
  )
}

/* ------------------------------- Riwayat -------------------------------- */

function TabRiwayat({ rows }: { rows: BarisPencairan[] }) {
  const columns = React.useMemo<ColumnDef<BarisPencairan, any>[]>(
    () => [
      {
        accessorKey: 'unit',
        header: 'Unit',
        cell: ({ row }) => (
          <div>
            <span className="block font-medium">{row.original.unit}</span>
            <span className="block text-label text-ink-muted">{row.original.no_polisi ?? '-'}</span>
          </div>
        ),
      },
      { accessorKey: 'investor_nama', header: 'Investor' },
      {
        accessorKey: 'bagi_hasil',
        header: 'Dicairkan',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} className="font-medium" />,
      },
      {
        accessorKey: 'tanggal_dicairkan',
        header: 'Tanggal Cair',
        meta: { exportValue: (r: BarisPencairan) => r.tanggal_dicairkan ?? '' },
        cell: ({ getValue }) => (getValue() ? formatTanggal(getValue() as string) : '-'),
      },
      {
        id: 'bukti',
        header: 'Bukti Transfer',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.bukti_transfer_url ? (
            <TombolLihatBukti path={row.original.bukti_transfer_url} />
          ) : (
            <span className="text-label text-ink-subtle">-</span>
          ),
      },
    ],
    [],
  )

  return (
    <DataTable<BarisPencairan>
      columns={columns}
      data={rows}
      searchKeys={['unit', 'investor_nama']}
      searchPlaceholder="Cari unit atau nama investor..."
      exportName="riwayat-pencairan"
      empty={
        <EmptyState
          icon={Banknote}
          title="Belum ada pencairan"
          description="Riwayat transfer bagi hasil ke investor akan muncul di sini."
        />
      }
      mobileCard={(row) => (
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{row.investor_nama}</p>
              <p className="text-label text-ink-muted">{row.unit}</p>
            </div>
            <Money value={row.bagi_hasil} className="shrink-0 font-medium" />
          </div>
          <p className="text-label text-ink-muted">
            {row.tanggal_dicairkan ? formatTanggal(row.tanggal_dicairkan) : '-'}
          </p>
        </div>
      )}
    />
  )
}

function TombolLihatBukti({ path }: { path: string }) {
  const [loading, setLoading] = React.useState(false)

  async function buka() {
    setLoading(true)
    try {
      const res = await getSignedUrlDokumen(path)
      if (!res.ok) throw new Error(res.error)
      window.open(res.data.url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={buka}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-label text-accent hover:underline disabled:opacity-60"
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
      Lihat bukti
    </button>
  )
}

/* --------------------------- Dialog proses pencairan --------------------------- */

function DialogProsesPencairan({
  baris,
  open,
  onOpenChange,
}: {
  baris: BarisPencairan
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [tanggal, setTanggal] = React.useState(todayJakarta())
  const [buktiPath, setBuktiPath] = React.useState<string | null>(null)
  const [buktiNama, setBuktiNama] = React.useState<string | null>(null)

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Proses Pencairan Dana"
      description={`${baris.investor_nama} — ${baris.unit}`}
      submitLabel="Konfirmasi Pencairan"
      successMessage="Pencairan tercatat. Saldo investor sudah diperbarui."
      onSubmit={() =>
        prosesPencairan({
          detail_id: baris.id,
          tanggal,
          bukti_transfer_url: buktiPath,
        })
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-accent-soft p-4">
          <p className="mm-label-caps text-accent/70">Margin yang dicairkan</p>
          <Money value={baris.bagi_hasil} size="lg" colored className="mt-1 block" />
          <p className="mt-1 text-label text-accent">
            Modal pokok {baris.investor_nama.split(' ')[0]} tetap ada di saldo, cuma bagian
            keuntungan ini yang ditarik.
          </p>
        </div>

        <Field label="Tanggal Transfer" required htmlFor="tgl-cair">
          <Input
            id="tgl-cair"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </Field>

        <Field label="Bukti Transfer">
          <DokumenUpload
            value={buktiPath}
            onChange={setBuktiPath}
            namaFile={buktiNama}
            onNamaFileChange={setBuktiNama}
          />
        </Field>

        <p className="rounded-lg bg-surface-alt p-3 text-label text-ink-muted">
          Setelah dikonfirmasi, sistem mencatat penarikan sebesar margin ini dan menandai baris
          ini sudah dicairkan. Investor bisa lihat riwayat lengkapnya di dashboard mereka.
        </p>
      </div>
    </FormDialog>
  )
}
