'use client'

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowDownLeft, Banknote, HandCoins, Lock, Plus, Trash2, Wallet } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { Money } from '@/components/shared/money'
import { MetricCard } from '@/components/shared/metric-card'
import { RowActions } from '@/components/shared/row-actions'
import { useConfirm } from '@/components/shared/confirm-dialog'
import { FormDialog, FormGrid, useAksi } from '@/components/forms/form-dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, MoneyInput, Textarea } from '@/components/ui/input'
import { Card, CardTitle } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { catatMutasiKas, cairkanHakPengelola, hapusMutasiKas } from '@/app/actions/bank'
import { formatTanggal, todayJakarta } from '@/lib/format'
import { CASH_TYPE_LABEL, CASH_TYPE_MANUAL } from '@/lib/constants'
import type { AkunBank, HakPengelola, MutasiKas } from '@/lib/queries/bank'

export function KasClient({
  akun,
  mutasi,
  hak,
  error,
  canWrite,
}: {
  akun: AkunBank[]
  mutasi: MutasiKas[]
  hak: HakPengelola
  error: string | null
  canWrite: boolean
}) {
  const [filterAkun, setFilterAkun] = React.useState<string>('semua')
  const [openMutasi, setOpenMutasi] = React.useState(false)
  const [openPrive, setOpenPrive] = React.useState(false)

  const akunAktif = React.useMemo(() => akun.filter((a) => a.is_active), [akun])
  const totalSaldo = React.useMemo(() => akun.reduce((s, a) => s + a.saldo, 0), [akun])

  const baris = React.useMemo(
    () => (filterAkun === 'semua' ? mutasi : mutasi.filter((m) => m.bank_account_id === filterAkun)),
    [mutasi, filterAkun],
  )

  if (error) {
    return (
      <div className="mm-card">
        <ErrorState description={error} />
      </div>
    )
  }

  if (akun.length === 0) {
    return (
      <div className="mm-card">
        <EmptyState
          icon={Wallet}
          title="Belum ada rekening"
          description="Tambahkan rekening perusahaan lebih dulu di menu Master → Akun Bank. Setelah itu semua transaksi akan otomatis tercatat di sini."
        />
      </div>
    )
  }

  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Saldo Kas"
          value={totalSaldo}
          format="money"
          icon={Wallet}
          subtext={`${akunAktif.length} rekening aktif`}
        />
        <MetricCard
          label="Hak Pengelola Tersedia"
          value={hak.tersedia}
          format="money"
          icon={HandCoins}
          tone={hak.tersedia < 0 ? 'danger' : 'success'}
          subtext="Siap dicairkan ke rekening pribadi"
        />
        <MetricCard
          label="Sudah Dicairkan"
          value={hak.sudahDicairkan}
          format="money"
          icon={Banknote}
          subtext="Akumulasi prive pengelola"
        />
        <MetricCard
          label="Porsi Bagi Hasil Pengelola"
          value={hak.porsiBagiHasil}
          format="money"
          icon={ArrowDownLeft}
          subtext="Dari seluruh unit terjual"
        />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle className="mb-3">Saldo per Rekening</CardTitle>
          <ul className="divide-y divide-line">
            {akun.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {a.nama}
                    {a.is_default ? (
                      <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                        Default
                      </span>
                    ) : null}
                  </p>
                  <p className="text-label text-ink-muted">
                    {a.nama_bank} · {a.no_rekening}
                  </p>
                </div>
                <Money value={a.saldo} colored className="shrink-0 font-medium" />
              </li>
            ))}
          </ul>
        </Card>

        <RincianHakPengelola hak={hak} />
      </div>

      <DataTable<MutasiKas>
        columns={kolomMutasi(canWrite)}
        data={baris}
        searchKeys={['keterangan', 'bank_nama']}
        searchPlaceholder="Cari mutasi..."
        exportName="mutasi-kas"
        toolbarAction={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterAkun} onValueChange={setFilterAkun}>
              <SelectTrigger className="w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua rekening</SelectItem>
                {akun.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {canWrite ? (
              <>
                <Button variant="secondary" onClick={() => setOpenPrive(true)}>
                  <HandCoins />
                  <span className="hidden lg:inline">Cairkan Hak Pengelola</span>
                  <span className="lg:hidden">Cairkan</span>
                </Button>
                <Button onClick={() => setOpenMutasi(true)}>
                  <Plus />
                  <span className="hidden sm:inline">Catat Mutasi</span>
                  <span className="sm:hidden">Mutasi</span>
                </Button>
              </>
            ) : null}
          </div>
        }
        empty={
          <EmptyState
            icon={Wallet}
            title="Belum ada mutasi kas"
            description="Mutasi akan muncul otomatis begitu ada pembelian, penjualan, atau biaya yang dicatat."
          />
        }
        mobileCard={(row) => (
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{CASH_TYPE_LABEL[row.tipe]}</p>
                <p className="text-label text-ink-muted">{row.keterangan}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Money value={row.amount} colored className="font-medium" />
                {canWrite && !row.is_auto ? <TombolHapusMutasi id={row.id} /> : null}
              </div>
            </div>
            <p className="text-label text-ink-muted">
              {formatTanggal(row.tanggal)} · {row.bank_nama}
            </p>
          </div>
        )}
      />

      <DialogMutasiKas
        open={openMutasi}
        onOpenChange={setOpenMutasi}
        akun={akunAktif}
      />
      <DialogCairkanPengelola
        open={openPrive}
        onOpenChange={setOpenPrive}
        akun={akunAktif}
        hak={hak}
      />
    </>
  )
}

/* ------------------------- Rincian hak pengelola ------------------------- */

function RincianHakPengelola({ hak }: { hak: HakPengelola }) {
  const baris = [
    { label: 'Modal disetor sendiri', value: hak.modalDisetor },
    { label: 'Porsi bagi hasil', value: hak.porsiBagiHasil },
    { label: 'Biaya operasional', value: -hak.biayaOperasional },
    { label: 'Pembelian aset', value: -hak.pembelianAset },
    { label: 'Sudah dicairkan', value: -hak.sudahDicairkan },
  ]

  return (
    <Card>
      <CardTitle className="mb-1">Hak Pengelola</CardTitle>
      <p className="mb-3 text-label text-ink-muted">
        Uang pengelola sendiri, terpisah dari dana investor.
      </p>
      <ul className="divide-y divide-line">
        {baris.map((b) => (
          <li key={b.label} className="flex items-center justify-between gap-3 py-2">
            <span className="text-label text-ink-muted">{b.label}</span>
            <Money value={b.value} colored className="shrink-0 text-label" />
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-sm font-medium text-ink">Tersedia dicairkan</span>
        <Money value={hak.tersedia} colored className="shrink-0 font-semibold" />
      </div>
    </Card>
  )
}

/* ------------------------------- Kolom ---------------------------------- */

function kolomMutasi(canWrite: boolean): ColumnDef<MutasiKas, any>[] {
  return [
    {
      accessorKey: 'tanggal',
      header: 'Tanggal',
      meta: { exportValue: (r: MutasiKas) => r.tanggal },
      cell: ({ getValue }) => formatTanggal(getValue() as string),
    },
    {
      accessorKey: 'tipe',
      header: 'Jenis',
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-neutral-soft px-2.5 py-1 text-[12px] font-medium text-ink-muted">
            {CASH_TYPE_LABEL[row.original.tipe]}
          </span>
          {row.original.is_auto ? (
            <span title="Dicatat otomatis dari transaksinya">
              <Lock className="size-3 text-ink-subtle" />
            </span>
          ) : null}
        </span>
      ),
    },
    { accessorKey: 'keterangan', header: 'Keterangan' },
    { accessorKey: 'bank_nama', header: 'Rekening' },
    {
      accessorKey: 'amount',
      header: 'Nominal',
      meta: { align: 'right' as const },
      cell: ({ getValue }) => (
        <Money value={getValue() as number} colored className="font-medium" />
      ),
    },
    ...(canWrite
      ? [
          {
            id: 'aksi',
            header: '',
            enableSorting: false,
            meta: { align: 'right' as const },
            cell: ({ row }: any) =>
              row.original.is_auto ? null : <TombolHapusMutasi id={row.original.id} />,
          } as ColumnDef<MutasiKas, any>,
        ]
      : []),
  ]
}

function TombolHapusMutasi({ id }: { id: string }) {
  const { confirm, dialog } = useConfirm()
  const { jalankan } = useAksi()

  return (
    <>
      <RowActions
        actions={[
          {
            label: 'Hapus',
            icon: Trash2,
            tone: 'danger',
            onSelect: () =>
              confirm({
                title: 'Hapus mutasi ini?',
                description:
                  'Mutasi manual ini akan dihapus dan saldo rekening menyesuaikan kembali.',
                confirmLabel: 'Ya, hapus',
                successMessage: 'Mutasi dihapus',
                onConfirm: async () => {
                  const ok = await jalankan(() => hapusMutasiKas(id))
                  if (!ok) throw new Error('')
                },
              }),
          },
        ]}
      />
      {dialog}
    </>
  )
}

/* ---------------------------- Dialog mutasi ----------------------------- */

function DialogMutasiKas({
  open,
  onOpenChange,
  akun,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  akun: AkunBank[]
}) {
  const defaultAkun = akun.find((a) => a.is_default)?.id ?? akun[0]?.id ?? ''
  const [bankId, setBankId] = React.useState(defaultAkun)
  const [tanggal, setTanggal] = React.useState(todayJakarta())
  const [tipe, setTipe] = React.useState<string>('SETOR_MODAL_PENGELOLA')
  const [nominal, setNominal] = React.useState(0)
  const [keterangan, setKeterangan] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setBankId(defaultAkun)
    setTanggal(todayJakarta())
    setTipe('SETOR_MODAL_PENGELOLA')
    setNominal(0)
    setKeterangan('')
  }, [open, defaultAkun])

  const keluar = tipe === 'PRIVE_PENGELOLA' || tipe === 'TRANSFER_KELUAR'

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Catat Mutasi Kas"
      description="Untuk uang masuk/keluar yang tidak punya transaksi operasionalnya sendiri."
      successMessage="Mutasi kas tercatat"
      disabled={!bankId || nominal <= 0 || !keterangan}
      onSubmit={() =>
        catatMutasiKas({
          bank_account_id: bankId,
          tanggal,
          tipe,
          nominal,
          keterangan,
        })
      }
    >
      <div className="space-y-4">
        <FormGrid>
          <Field label="Rekening" required htmlFor="mutasi-bank">
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger id="mutasi-bank">
                <SelectValue placeholder="Pilih rekening" />
              </SelectTrigger>
              <SelectContent>
                {akun.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Tanggal" required htmlFor="mutasi-tgl">
            <Input
              id="mutasi-tgl"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </Field>
        </FormGrid>

        <Field label="Jenis Mutasi" required htmlFor="mutasi-tipe">
          <Select value={tipe} onValueChange={setTipe}>
            <SelectTrigger id="mutasi-tipe">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CASH_TYPE_MANUAL.map((t) => (
                <SelectItem key={t} value={t}>
                  {CASH_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Nominal"
          required
          hint={keluar ? 'Akan dicatat sebagai uang keluar' : 'Akan dicatat sebagai uang masuk'}
        >
          <MoneyInput value={nominal} onChange={setNominal} />
        </Field>

        <Field label="Keterangan" required htmlFor="mutasi-ket">
          <Textarea
            id="mutasi-ket"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Contoh: Setor modal tambahan untuk operasional Agustus"
          />
        </Field>

        <p className="rounded-lg bg-surface-alt p-3 text-label text-ink-muted">
          Pembelian unit, penjualan, perbaikan, biaya operasional, dan setoran investor tidak ada di
          daftar ini karena sudah tercatat otomatis dari transaksinya masing-masing.
        </p>
      </div>
    </FormDialog>
  )
}

/* ------------------------ Dialog cairkan pengelola ----------------------- */

function DialogCairkanPengelola({
  open,
  onOpenChange,
  akun,
  hak,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  akun: AkunBank[]
  hak: HakPengelola
}) {
  const defaultAkun = akun.find((a) => a.is_default)?.id ?? akun[0]?.id ?? ''
  const [bankId, setBankId] = React.useState(defaultAkun)
  const [tanggal, setTanggal] = React.useState(todayJakarta())
  const [nominal, setNominal] = React.useState(0)
  const [keterangan, setKeterangan] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setBankId(defaultAkun)
    setTanggal(todayJakarta())
    setNominal(0)
    setKeterangan('')
  }, [open, defaultAkun])

  const bisa = hak.tersedia > 0

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Cairkan Hak Pengelola"
      description="Menarik bagian keuntungan pengelola ke rekening pribadi."
      successMessage="Pencairan tercatat"
      disabled={!bisa || !bankId || nominal <= 0}
      onSubmit={() =>
        cairkanHakPengelola({
          bank_account_id: bankId,
          tanggal,
          nominal,
          keterangan,
        })
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-accent-soft p-4">
          <p className="mm-label-caps text-accent/70">Tersedia dicairkan</p>
          <Money value={hak.tersedia} size="lg" colored className="mt-1 block" />
          <p className="mt-1 text-label text-accent">
            Modal disetor {'+'} porsi bagi hasil, dikurangi biaya operasional, pembelian aset, dan
            yang sudah pernah ditarik.
          </p>
        </div>

        {!bisa ? (
          <p className="rounded-lg bg-warning-soft p-3 text-label text-warning-deep">
            Belum ada yang bisa dicairkan. Biaya operasional dan pembelian aset masih lebih besar
            daripada bagian keuntungan pengelola.
          </p>
        ) : null}

        <FormGrid>
          <Field label="Rekening Sumber" required htmlFor="prive-bank">
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger id="prive-bank">
                <SelectValue placeholder="Pilih rekening" />
              </SelectTrigger>
              <SelectContent>
                {akun.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Tanggal Transfer" required htmlFor="prive-tgl">
            <Input
              id="prive-tgl"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </Field>
        </FormGrid>

        <Field label="Nominal" required>
          <MoneyInput value={nominal} onChange={setNominal} />
        </Field>

        <Field label="Keterangan" htmlFor="prive-ket">
          <Input
            id="prive-ket"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Pencairan hak pengelola Juli"
          />
        </Field>
      </div>
    </FormDialog>
  )
}
