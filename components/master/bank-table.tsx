'use client'

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Landmark, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/states'
import { Money } from '@/components/shared/money'
import { RowActions } from '@/components/shared/row-actions'
import { useConfirm } from '@/components/shared/confirm-dialog'
import { FormDialog, FormGrid, useAksi } from '@/components/forms/form-dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, MoneyInput, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/primitives'
import { simpanAkunBank, hapusAkunBank } from '@/app/actions/bank'
import { formatTanggal, todayJakarta } from '@/lib/format'
import type { AkunBank } from '@/lib/queries/bank'

export function BankTable({
  rows,
  error,
  canWrite,
}: {
  rows: AkunBank[]
  error: string | null
  canWrite: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<AkunBank | null>(null)
  const { confirm, dialog } = useConfirm()
  const { jalankan } = useAksi()

  function bukaTambah() {
    setEditing(null)
    setOpen(true)
  }

  const columns = React.useMemo<ColumnDef<AkunBank, any>[]>(
    () => [
      {
        accessorKey: 'nama',
        header: 'Rekening',
        cell: ({ row }) => (
          <div>
            <span className="flex items-center gap-1.5 font-medium">
              {row.original.nama}
              {row.original.is_default ? (
                <span
                  title="Rekening default — semua pencatatan otomatis masuk ke sini"
                  className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent"
                >
                  <Star className="size-3" />
                  Default
                </span>
              ) : null}
              {!row.original.is_active ? (
                <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                  Nonaktif
                </span>
              ) : null}
            </span>
            <span className="block text-label text-ink-muted">
              {row.original.nama_bank} · {row.original.no_rekening}
            </span>
          </div>
        ),
      },
      { accessorKey: 'atas_nama', header: 'Atas Nama' },
      {
        accessorKey: 'saldo_awal',
        header: 'Saldo Awal',
        meta: { align: 'right' as const },
        cell: ({ row }) => (
          <div className="text-right">
            <Money value={row.original.saldo_awal} className="block" />
            <span className="text-label text-ink-muted">
              {formatTanggal(row.original.tanggal_saldo_awal)}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'saldo',
        header: 'Saldo Saat Ini',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => (
          <Money value={getValue() as number} colored className="font-medium" />
        ),
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
                      title: 'Hapus rekening ini?',
                      description: `${row.original.nama} akan dihapus. Kalau sudah pernah ada mutasi kas, penghapusan akan ditolak — nonaktifkan saja lewat Edit.`,
                      confirmLabel: 'Ya, hapus',
                      successMessage: 'Rekening dihapus',
                      onConfirm: async () => {
                        const ok = await jalankan(() => hapusAkunBank(row.original.id))
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
      <DataTable<AkunBank>
        columns={columns}
        data={rows}
        searchKeys={['nama', 'nama_bank', 'no_rekening', 'atas_nama']}
        searchPlaceholder="Cari rekening..."
        exportName="akun-bank"
        error={error}
        toolbarAction={
          canWrite ? (
            <Button onClick={bukaTambah}>
              <Plus />
              <span className="hidden sm:inline">Tambah Rekening</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          ) : null
        }
        empty={
          <EmptyState
            icon={Landmark}
            title="Belum ada rekening"
            description="Tambahkan rekening perusahaan supaya semua arus uang tercatat dan saldonya bisa dicocokkan dengan rekening koran."
            action={
              canWrite ? (
                <Button onClick={bukaTambah}>
                  <Plus />
                  Tambah Rekening
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
                {row.nama_bank} · {row.no_rekening}
              </p>
            </div>
            <Money value={row.saldo} colored className="shrink-0 font-medium" />
          </div>
        )}
      />

      <BankFormDialog open={open} onOpenChange={setOpen} akun={editing} />
      {dialog}
    </>
  )
}

function BankFormDialog({
  open,
  onOpenChange,
  akun,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  akun: AkunBank | null
}) {
  const [nama, setNama] = React.useState('')
  const [namaBank, setNamaBank] = React.useState('')
  const [noRekening, setNoRekening] = React.useState('')
  const [atasNama, setAtasNama] = React.useState('')
  const [saldoAwal, setSaldoAwal] = React.useState(0)
  const [tanggal, setTanggal] = React.useState(todayJakarta())
  const [isDefault, setIsDefault] = React.useState(false)
  const [isActive, setIsActive] = React.useState(true)
  const [catatan, setCatatan] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setNama(akun?.nama ?? '')
    setNamaBank(akun?.nama_bank ?? '')
    setNoRekening(akun?.no_rekening ?? '')
    setAtasNama(akun?.atas_nama ?? '')
    setSaldoAwal(akun?.saldo_awal ?? 0)
    setTanggal(akun?.tanggal_saldo_awal ?? todayJakarta())
    setIsDefault(akun?.is_default ?? false)
    setIsActive(akun?.is_active ?? true)
    setCatatan(akun?.catatan ?? '')
  }, [open, akun])

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={akun ? 'Edit Rekening' : 'Tambah Rekening'}
      description="Saldo awal hanya dipakai kalau rekening sudah punya isi sebelum mulai dicatat di aplikasi."
      successMessage="Rekening tersimpan"
      disabled={!nama || !namaBank || !noRekening || !atasNama}
      onSubmit={() =>
        simpanAkunBank({
          ...(akun ? { id: akun.id } : {}),
          nama,
          nama_bank: namaBank,
          no_rekening: noRekening,
          atas_nama: atasNama,
          saldo_awal: saldoAwal,
          tanggal_saldo_awal: tanggal,
          is_default: isDefault,
          is_active: isActive,
          catatan,
        })
      }
    >
      <div className="space-y-4">
        <Field label="Nama Rekening" required htmlFor="nama-bank-akun">
          <Input
            id="nama-bank-akun"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Contoh: Rekening Operasional"
          />
        </Field>

        <FormGrid>
          <Field label="Bank" required htmlFor="nama-bank">
            <Input
              id="nama-bank"
              value={namaBank}
              onChange={(e) => setNamaBank(e.target.value)}
              placeholder="BCA"
            />
          </Field>

          <Field label="Nomor Rekening" required htmlFor="no-rek">
            <Input
              id="no-rek"
              value={noRekening}
              onChange={(e) => setNoRekening(e.target.value)}
              placeholder="2761234567"
            />
          </Field>

          <Field label="Atas Nama" required htmlFor="atas-nama">
            <Input
              id="atas-nama"
              value={atasNama}
              onChange={(e) => setAtasNama(e.target.value)}
              placeholder="PT MobilMint Indonesia"
            />
          </Field>

          <Field label="Tanggal Saldo Awal" required htmlFor="tgl-saldo-awal">
            <Input
              id="tgl-saldo-awal"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </Field>
        </FormGrid>

        <Field
          label="Saldo Awal"
          hint="Isi 0 kalau semua arus uang mulai dicatat dari nol di aplikasi ini"
        >
          <MoneyInput value={saldoAwal} onChange={setSaldoAwal} />
        </Field>

        <div className="space-y-3 rounded-lg bg-surface-alt p-4">
          <label className="flex items-start justify-between gap-3">
            <span>
              <span className="block text-sm font-medium text-ink">Jadikan rekening default</span>
              <span className="block text-label text-ink-muted">
                Semua pencatatan kas otomatis (pembelian, penjualan, biaya) masuk ke rekening ini.
              </span>
            </span>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </label>

          <label className="flex items-start justify-between gap-3">
            <span>
              <span className="block text-sm font-medium text-ink">Rekening aktif</span>
              <span className="block text-label text-ink-muted">
                Nonaktifkan kalau rekening sudah tidak dipakai, riwayatnya tetap tersimpan.
              </span>
            </span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
        </div>

        <Field label="Catatan" htmlFor="catatan-bank">
          <Textarea
            id="catatan-bank"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Cabang, keperluan khusus, dll."
          />
        </Field>
      </div>
    </FormDialog>
  )
}
