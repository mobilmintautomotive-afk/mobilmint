'use client'

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle2, PackageX, Plus, Repeat, Trash2 } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/states'
import { Money } from '@/components/shared/money'
import { StatusBadge } from '@/components/shared/status-badge'
import { RowActions } from '@/components/shared/row-actions'
import { useConfirm } from '@/components/shared/confirm-dialog'
import { FormDialog, FormGrid, useAksi } from '@/components/forms/form-dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, MoneyInput, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  buatTitipJual,
  hapusTitipJual,
  selesaikanJasaKonten,
  jualKonsinyasi,
  tarikKonsinyasi,
} from '@/app/actions/titip-jual'
import { formatTanggal, todayJakarta } from '@/lib/format'
import {
  TITIP_JUAL_SKEMA,
  TITIP_JUAL_SKEMA_LABEL,
  FEE_TITIP_JUAL_DEFAULT,
  type TitipJualSkema,
  type TitipJualStatus,
} from '@/lib/constants'

type TitipJual = {
  id: string
  no_titip: string
  skema: TitipJualSkema
  merek: string
  tipe: string
  tahun: number
  no_polisi: string | null
  nama_pemilik: string
  no_tlp_pemilik: string | null
  tanggal_masuk: string
  fee_jasa: number
  harga_setor: number | null
  status: TitipJualStatus
  tanggal_selesai: string | null
  harga_jual: number | null
  pendapatan: number | null
  catatan: string | null
}

const SKEMA_STYLE: Record<TitipJualSkema, string> = {
  JASA_KONTEN: 'bg-neutral-soft text-ink-muted',
  KONSINYASI: 'bg-accent-soft text-accent',
}

function SkemaBadge({ skema }: { skema: TitipJualSkema }) {
  return (
    <span
      className={
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium leading-none ' +
        SKEMA_STYLE[skema]
      }
    >
      {TITIP_JUAL_SKEMA_LABEL[skema]}
    </span>
  )
}

export function TitipJualClient({
  rows,
  error,
  canWrite,
}: {
  rows: TitipJual[]
  error: string | null
  canWrite: boolean
}) {
  const [openBaru, setOpenBaru] = React.useState(false)
  const [selesaikan, setSelesaikan] = React.useState<TitipJual | null>(null)
  const [jual, setJual] = React.useState<TitipJual | null>(null)
  const [tarik, setTarik] = React.useState<TitipJual | null>(null)
  const { confirm, dialog } = useConfirm()
  const { jalankan } = useAksi()

  const columns = React.useMemo<ColumnDef<TitipJual, any>[]>(
    () => [
      { accessorKey: 'no_titip', header: 'No. Titip' },
      {
        id: 'unit',
        header: 'Unit',
        meta: { exportValue: (r: TitipJual) => `${r.merek} ${r.tipe} ${r.tahun}` },
        cell: ({ row }) => (
          <div>
            <span className="block font-medium">
              {row.original.merek} {row.original.tipe} {row.original.tahun}
            </span>
            <span className="block text-label text-ink-muted">{row.original.no_polisi ?? '-'}</span>
          </div>
        ),
      },
      {
        id: 'pemilik',
        header: 'Pemilik',
        meta: { exportValue: (r: TitipJual) => r.nama_pemilik },
        cell: ({ row }) => (
          <div>
            <span className="block">{row.original.nama_pemilik}</span>
            <span className="block text-label text-ink-muted">{row.original.no_tlp_pemilik ?? '-'}</span>
          </div>
        ),
      },
      {
        accessorKey: 'skema',
        header: 'Skema',
        meta: { align: 'center' as const, exportValue: (r: TitipJual) => TITIP_JUAL_SKEMA_LABEL[r.skema] },
        cell: ({ getValue }) => <SkemaBadge skema={getValue() as TitipJualSkema} />,
      },
      {
        accessorKey: 'tanggal_masuk',
        header: 'Tanggal Masuk',
        meta: { exportValue: (r: TitipJual) => r.tanggal_masuk },
        cell: ({ getValue }) => formatTanggal(getValue() as string),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { align: 'center' as const },
        cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
      },
      {
        id: 'nilai',
        header: 'Nilai',
        meta: {
          align: 'right' as const,
          exportValue: (r: TitipJual) =>
            r.pendapatan ?? (r.skema === 'KONSINYASI' ? r.harga_setor ?? 0 : r.fee_jasa),
        },
        cell: ({ row }) => {
          const r = row.original
          if (r.status !== 'PROSES') {
            return (
              <div className="text-right">
                <Money value={r.pendapatan} className="font-medium" colored />
                <p className="text-label text-ink-muted">pendapatan</p>
              </div>
            )
          }
          return (
            <div className="text-right">
              <Money value={r.skema === 'KONSINYASI' ? r.harga_setor : r.fee_jasa} />
              <p className="text-label text-ink-muted">
                {r.skema === 'KONSINYASI' ? 'harga setor' : 'fee jasa'}
              </p>
            </div>
          )
        },
      },
      {
        id: 'aksi',
        header: '',
        enableSorting: false,
        meta: { align: 'right' as const },
        cell: ({ row }) => {
          if (!canWrite || row.original.status !== 'PROSES') return null
          const r = row.original
          const actions =
            r.skema === 'JASA_KONTEN'
              ? [{ label: 'Tandai Selesai', icon: CheckCircle2, onSelect: () => setSelesaikan(r) }]
              : [
                  { label: 'Tandai Terjual', icon: CheckCircle2, onSelect: () => setJual(r) },
                  { label: 'Tarik Unit', icon: PackageX, onSelect: () => setTarik(r) },
                ]
          return (
            <RowActions
              actions={[
                ...actions,
                {
                  label: 'Hapus',
                  icon: Trash2,
                  tone: 'danger' as const,
                  onSelect: () =>
                    confirm({
                      title: 'Hapus pendaftaran ini?',
                      description: `Titip jual ${r.no_titip} (${r.merek} ${r.tipe} ${r.tahun}) akan dihapus.`,
                      confirmLabel: 'Ya, hapus',
                      successMessage: 'Pendaftaran dihapus',
                      onConfirm: async () => {
                        const ok = await jalankan(() => hapusTitipJual(r.id))
                        if (!ok) throw new Error('')
                      },
                    }),
                },
              ]}
            />
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canWrite],
  )

  return (
    <div className="mb-5">
      <DataTable<TitipJual>
        columns={columns}
        data={rows}
        searchKeys={['no_titip', 'merek', 'tipe', 'nama_pemilik', 'no_polisi']}
        searchPlaceholder="Cari no. titip, unit, atau pemilik..."
        exportName="titip-jual"
        error={error}
        toolbarAction={
          canWrite ? (
            <Button onClick={() => setOpenBaru(true)}>
              <Plus />
              <span className="hidden sm:inline">Titip Jual Baru</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          ) : null
        }
        empty={
          <EmptyState
            icon={Repeat}
            title="Belum ada unit titip jual"
            description="Catat unit titipan dari pihak luar di sini — baik yang cuma numpang konten (Jasa Konten) maupun yang ditahan sampai laku (Konsinyasi)."
            action={
              canWrite ? (
                <Button onClick={() => setOpenBaru(true)}>
                  <Plus />
                  Titip Jual Baru
                </Button>
              ) : undefined
            }
          />
        }
        mobileCard={(row) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {row.merek} {row.tipe} {row.tahun}
                </p>
                <p className="text-label text-ink-muted">
                  {row.no_titip} · {row.nama_pemilik}
                </p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <div className="flex items-center justify-between">
              <SkemaBadge skema={row.skema} />
              <Money
                value={row.pendapatan ?? (row.skema === 'KONSINYASI' ? row.harga_setor : row.fee_jasa)}
                className="font-medium"
              />
            </div>
          </div>
        )}
      />

      <TitipJualFormDialog open={openBaru} onOpenChange={setOpenBaru} />
      <SelesaikanDialog row={selesaikan} onOpenChange={() => setSelesaikan(null)} />
      <JualKonsinyasiDialog row={jual} onOpenChange={() => setJual(null)} />
      <TarikKonsinyasiDialog row={tarik} onOpenChange={() => setTarik(null)} />
      {dialog}
    </div>
  )
}

/* ---------------------------- Form pendaftaran ---------------------------- */

function TitipJualFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [skema, setSkema] = React.useState<TitipJualSkema>('JASA_KONTEN')
  const [merek, setMerek] = React.useState('')
  const [tipe, setTipe] = React.useState('')
  const [tahun, setTahun] = React.useState<number>(new Date().getFullYear())
  const [noPolisi, setNoPolisi] = React.useState('')
  const [namaPemilik, setNamaPemilik] = React.useState('')
  const [tlpPemilik, setTlpPemilik] = React.useState('')
  const [tanggalMasuk, setTanggalMasuk] = React.useState(todayJakarta())
  const [feeJasa, setFeeJasa] = React.useState(FEE_TITIP_JUAL_DEFAULT)
  const [hargaSetor, setHargaSetor] = React.useState(0)
  const [catatan, setCatatan] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setSkema('JASA_KONTEN')
    setMerek('')
    setTipe('')
    setTahun(new Date().getFullYear())
    setNoPolisi('')
    setNamaPemilik('')
    setTlpPemilik('')
    setTanggalMasuk(todayJakarta())
    setFeeJasa(FEE_TITIP_JUAL_DEFAULT)
    setHargaSetor(0)
    setCatatan('')
  }, [open])

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Titip Jual Baru"
      description="Unit titipan pihak luar — bukan milik MobilMint dan tidak dibiayai modal investor."
      submitLabel="Simpan"
      successMessage="Titip jual tersimpan"
      disabled={
        !merek ||
        !tipe ||
        !namaPemilik ||
        (skema === 'KONSINYASI' && hargaSetor <= 0)
      }
      onSubmit={() =>
        buatTitipJual({
          skema,
          merek,
          tipe,
          tahun,
          no_polisi: noPolisi,
          nama_pemilik: namaPemilik,
          no_tlp_pemilik: tlpPemilik,
          tanggal_masuk: tanggalMasuk,
          fee_jasa: feeJasa,
          harga_setor: skema === 'KONSINYASI' ? hargaSetor : null,
          catatan,
        })
      }
    >
      <div className="space-y-5 pb-2">
        <Field
          label="Skema"
          required
          htmlFor="skema-titip"
          hint={
            skema === 'JASA_KONTEN'
              ? 'Unit numpang 1 hari buat konten, lalu dibawa pulang. Sekali fee.'
              : 'Unit ditahan di garasi sampai laku. Untung dari selisih harga jual dan harga setor ke pemilik.'
          }
        >
          <Select value={skema} onValueChange={(v) => setSkema(v as TitipJualSkema)}>
            <SelectTrigger id="skema-titip">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TITIP_JUAL_SKEMA.map((s) => (
                <SelectItem key={s} value={s}>
                  {TITIP_JUAL_SKEMA_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <FormGrid cols={3}>
          <Field label="Merek" required htmlFor="merek-titip">
            <Input id="merek-titip" value={merek} onChange={(e) => setMerek(e.target.value)} />
          </Field>
          <Field label="Tipe" required htmlFor="tipe-titip">
            <Input id="tipe-titip" value={tipe} onChange={(e) => setTipe(e.target.value)} />
          </Field>
          <Field label="Tahun" required htmlFor="tahun-titip">
            <Input
              id="tahun-titip"
              type="number"
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
            />
          </Field>
        </FormGrid>

        <FormGrid>
          <Field label="No. Polisi" htmlFor="polisi-titip">
            <Input id="polisi-titip" value={noPolisi} onChange={(e) => setNoPolisi(e.target.value)} />
          </Field>
          <Field label="Tanggal Masuk" required htmlFor="tgl-titip">
            <Input
              id="tgl-titip"
              type="date"
              value={tanggalMasuk}
              onChange={(e) => setTanggalMasuk(e.target.value)}
            />
          </Field>

          <Field label="Nama Pemilik" required htmlFor="pemilik-titip">
            <Input
              id="pemilik-titip"
              value={namaPemilik}
              onChange={(e) => setNamaPemilik(e.target.value)}
            />
          </Field>
          <Field label="No. Telepon Pemilik" htmlFor="tlp-titip">
            <Input id="tlp-titip" value={tlpPemilik} onChange={(e) => setTlpPemilik(e.target.value)} />
          </Field>

          {skema === 'JASA_KONTEN' ? (
            <Field
              label="Fee Jasa Konten"
              required
              htmlFor="fee-titip"
              hint="Default Rp 2.500.000, bisa disesuaikan"
            >
              <MoneyInput id="fee-titip" value={feeJasa} onChange={setFeeJasa} />
            </Field>
          ) : (
            <Field
              label="Harga Setor ke Pemilik"
              required
              htmlFor="setor-titip"
              hint="Kesepakatan harga yang dikembalikan ke pemilik saat unit laku"
            >
              <MoneyInput id="setor-titip" value={hargaSetor} onChange={setHargaSetor} />
            </Field>
          )}
        </FormGrid>

        <Field label="Catatan" htmlFor="catatan-titip">
          <Textarea id="catatan-titip" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </Field>
      </div>
    </FormDialog>
  )
}

/* ------------------------------ Tutup transaksi ------------------------------ */

function SelesaikanDialog({
  row,
  onOpenChange,
}: {
  row: TitipJual | null
  onOpenChange: (v: boolean) => void
}) {
  const [tanggal, setTanggal] = React.useState(todayJakarta())

  React.useEffect(() => {
    if (row) setTanggal(todayJakarta())
  }, [row])

  return (
    <FormDialog
      open={Boolean(row)}
      onOpenChange={onOpenChange}
      size="sm"
      title="Tandai Selesai"
      description={row ? `Konten ${row.merek} ${row.tipe} ${row.tahun} sudah dibuat, fee jasa diterima.` : ''}
      submitLabel="Tandai Selesai"
      successMessage="Titip jual ditandai selesai"
      onSubmit={() => selesaikanJasaKonten({ id: row!.id, tanggal_selesai: tanggal })}
    >
      <div className="space-y-4">
        <Field label="Tanggal Selesai" required htmlFor="tgl-selesai-titip">
          <Input
            id="tgl-selesai-titip"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </Field>
        {row ? (
          <div className="flex items-center justify-between rounded-lg bg-surface-alt px-4 py-3">
            <span className="text-label text-ink-muted">Fee jasa diterima</span>
            <Money value={row.fee_jasa} size="lg" className="font-medium" />
          </div>
        ) : null}
      </div>
    </FormDialog>
  )
}

function JualKonsinyasiDialog({
  row,
  onOpenChange,
}: {
  row: TitipJual | null
  onOpenChange: (v: boolean) => void
}) {
  const [tanggal, setTanggal] = React.useState(todayJakarta())
  const [hargaJual, setHargaJual] = React.useState(0)

  React.useEffect(() => {
    if (row) {
      setTanggal(todayJakarta())
      setHargaJual(row.harga_setor ?? 0)
    }
  }, [row])

  const untung = Math.max(0, hargaJual - (row?.harga_setor ?? 0))

  return (
    <FormDialog
      open={Boolean(row)}
      onOpenChange={onOpenChange}
      size="sm"
      title="Tandai Terjual"
      description={row ? `${row.merek} ${row.tipe} ${row.tahun} laku terjual.` : ''}
      submitLabel="Tandai Terjual"
      successMessage="Titip jual ditandai terjual"
      disabled={hargaJual <= 0 || hargaJual < (row?.harga_setor ?? 0)}
      onSubmit={() =>
        jualKonsinyasi({ id: row!.id, tanggal_selesai: tanggal, harga_jual: hargaJual })
      }
    >
      <div className="space-y-4">
        <Field label="Tanggal Jual" required htmlFor="tgl-jual-titip">
          <Input
            id="tgl-jual-titip"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </Field>
        <Field
          label="Harga Jual"
          required
          htmlFor="harga-jual-titip"
          hint={`Harga setor ke pemilik: ${row ? `Rp ${row.harga_setor?.toLocaleString('id-ID')}` : '-'}`}
        >
          <MoneyInput id="harga-jual-titip" value={hargaJual} onChange={setHargaJual} />
        </Field>
        <div className="flex items-center justify-between rounded-lg bg-surface-alt px-4 py-3">
          <span className="text-label text-ink-muted">Untung MobilMint</span>
          <Money value={untung} size="lg" className="font-medium" colored />
        </div>
      </div>
    </FormDialog>
  )
}

function TarikKonsinyasiDialog({
  row,
  onOpenChange,
}: {
  row: TitipJual | null
  onOpenChange: (v: boolean) => void
}) {
  const [tanggal, setTanggal] = React.useState(todayJakarta())
  const [biaya, setBiaya] = React.useState(FEE_TITIP_JUAL_DEFAULT)

  React.useEffect(() => {
    if (row) {
      setTanggal(todayJakarta())
      setBiaya(row.fee_jasa || FEE_TITIP_JUAL_DEFAULT)
    }
  }, [row])

  return (
    <FormDialog
      open={Boolean(row)}
      onOpenChange={onOpenChange}
      size="sm"
      title="Tarik Unit"
      description={
        row
          ? `${row.merek} ${row.tipe} ${row.tahun} ditarik pemiliknya sebelum laku. Kena biaya penarikan.`
          : ''
      }
      submitLabel="Tarik Unit"
      successMessage="Unit ditandai ditarik"
      onSubmit={() => tarikKonsinyasi({ id: row!.id, tanggal_selesai: tanggal, biaya_penarikan: biaya })}
    >
      <div className="space-y-4">
        <Field label="Tanggal Ditarik" required htmlFor="tgl-tarik-titip">
          <Input
            id="tgl-tarik-titip"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </Field>
        <Field
          label="Biaya Penarikan"
          required
          htmlFor="biaya-tarik-titip"
          hint="Default sama seperti fee Jasa Konten"
        >
          <MoneyInput id="biaya-tarik-titip" value={biaya} onChange={setBiaya} />
        </Field>
      </div>
    </FormDialog>
  )
}
