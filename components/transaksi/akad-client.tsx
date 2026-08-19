'use client'

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { BadgeCheck, Ban, Handshake, Plus, UserPlus } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/states'
import { Money } from '@/components/shared/money'
import { StatusBadge } from '@/components/shared/status-badge'
import { RowActions } from '@/components/shared/row-actions'
import { useConfirm } from '@/components/shared/confirm-dialog'
import { FormDialog, FormGrid, useAksi } from '@/components/forms/form-dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, MoneyInput, Textarea } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/primitives'
import { SearchableSelect } from '@/components/ui/select'
import { buatAkad, konfirmasiDanaDiterima, batalkanAkad } from '@/app/actions/contracts'
import { simpanInvestor } from '@/app/actions/master'
import { formatPersen, formatRupiah, formatTanggal, todayJakarta } from '@/lib/format'

type Akad = {
  id: string
  no_akad: string
  investor_id: string
  investor_nama: string
  /** null = kesepakatan tanpa batas plafon. */
  nilai_investasi: number | null
  nisbah_investor_pct: number
  tanggal_akad: string
  tanggal_dana_diterima: string | null
  jumlah_diterima: number | null
  status: string
}

export function AkadClient({
  rows,
  error,
  canWrite,
  investors,
  defaultNisbahPengelola,
}: {
  rows: Akad[]
  error: string | null
  canWrite: boolean
  investors: { id: string; nama: string }[]
  /** Saran awal nisbah pengelola dari Pengaturan — tetap bisa diubah bebas per akad. */
  defaultNisbahPengelola: number
}) {
  const [openForm, setOpenForm] = React.useState(false)
  const [konfirmasi, setKonfirmasi] = React.useState<Akad | null>(null)
  const [fStatus, setFStatus] = React.useState('semua')
  const { confirm, dialog } = useConfirm()
  const { jalankan } = useAksi()

  const data = React.useMemo(
    () => (fStatus === 'semua' ? rows : rows.filter((r) => r.status === fStatus)),
    [rows, fStatus],
  )

  const columns = React.useMemo<ColumnDef<Akad, any>[]>(
    () => [
      { accessorKey: 'no_akad', header: 'No. Akad' },
      {
        accessorKey: 'tanggal_akad',
        header: 'Tanggal Akad',
        meta: { exportValue: (r: Akad) => r.tanggal_akad },
        cell: ({ getValue }) => formatTanggal(getValue() as string),
      },
      { accessorKey: 'investor_nama', header: 'Investor' },
      {
        accessorKey: 'nilai_investasi',
        header: 'Nilai Investasi',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => {
          const v = getValue() as number | null
          return v === null ? (
            <span className="text-ink-subtle">Tanpa batas</span>
          ) : (
            <Money value={v} />
          )
        },
      },
      {
        accessorKey: 'nisbah_investor_pct',
        header: 'Nisbah',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => (
          <span className="tnum">{formatPersen(getValue() as number)}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { align: 'center' as const },
        cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
      },
      {
        id: 'aksi',
        header: '',
        enableSorting: false,
        meta: { align: 'right' as const },
        cell: ({ row }) => {
          const a = row.original
          if (!canWrite) return null

          if (a.status === 'MENUNGGU_DANA') {
            return (
              <div className="flex items-center justify-end gap-1">
                <Button size="sm" variant="accent" onClick={() => setKonfirmasi(a)}>
                  <BadgeCheck />
                  <span className="hidden lg:inline">Konfirmasi Dana</span>
                </Button>
                <RowActions
                  actions={[
                    {
                      label: 'Batalkan Akad',
                      icon: Ban,
                      tone: 'danger',
                      onSelect: () =>
                        confirm({
                          title: 'Batalkan akad ini?',
                          description: `Akad ${a.no_akad} atas nama ${a.investor_nama} akan ditandai Batal. Saldo tidak terpengaruh karena dana belum dikonfirmasi.`,
                          confirmLabel: 'Ya, batalkan',
                          successMessage: 'Akad dibatalkan',
                          onConfirm: async () => {
                            const ok = await jalankan(() => batalkanAkad(a.id))
                            if (!ok) throw new Error('')
                          },
                        }),
                    },
                  ]}
                />
              </div>
            )
          }

          return (
            <span className="text-label text-ink-subtle">
              {a.tanggal_dana_diterima ? `Dana ${formatTanggal(a.tanggal_dana_diterima)}` : '-'}
            </span>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canWrite],
  )

  return (
    <>
      <DataTable<Akad>
        columns={columns}
        data={data}
        searchKeys={['no_akad', 'investor_nama']}
        searchPlaceholder="Cari no. akad atau nama investor..."
        exportName="akad-investor"
        error={error}
        filters={[
          {
            id: 'status',
            label: 'Status',
            value: fStatus,
            onChange: setFStatus,
            options: [
              { value: 'semua', label: 'Semua Status' },
              { value: 'MENUNGGU_DANA', label: 'Menunggu Dana' },
              { value: 'AKTIF', label: 'Aktif' },
              { value: 'SELESAI', label: 'Selesai' },
              { value: 'BATAL', label: 'Batal' },
            ],
          },
        ]}
        toolbarAction={
          canWrite ? (
            <Button onClick={() => setOpenForm(true)}>
              <Plus />
              <span className="hidden sm:inline">Akad Baru</span>
              <span className="sm:hidden">Baru</span>
            </Button>
          ) : null
        }
        empty={
          <EmptyState
            icon={Handshake}
            title="Belum ada akad"
            description="Mulai dengan mendaftarkan investor lalu buat akad pertama."
            action={
              canWrite ? (
                <Button onClick={() => setOpenForm(true)}>
                  <Plus />
                  Akad Baru
                </Button>
              ) : undefined
            }
          />
        }
        mobileCard={(row) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{row.investor_nama}</p>
                <p className="text-label text-ink-muted">
                  {row.no_akad} · nisbah {formatPersen(row.nisbah_investor_pct)}
                </p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-label text-ink-muted">{formatTanggal(row.tanggal_akad)}</span>
              {row.nilai_investasi === null ? (
                <span className="text-label text-ink-subtle">Tanpa batas</span>
              ) : (
                <Money value={row.nilai_investasi} className="font-medium" />
              )}
            </div>
            {canWrite && row.status === 'MENUNGGU_DANA' ? (
              <Button size="sm" variant="accent" className="w-full" onClick={() => setKonfirmasi(row)}>
                <BadgeCheck />
                Konfirmasi Dana Diterima
              </Button>
            ) : null}
          </div>
        )}
      />

      <AkadFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        investors={investors}
        defaultNisbahPengelola={defaultNisbahPengelola}
      />

      {konfirmasi ? (
        <KonfirmasiDanaDialog
          akad={konfirmasi}
          open
          onOpenChange={(v) => !v && setKonfirmasi(null)}
        />
      ) : null}

      {dialog}
    </>
  )
}

/* --------------------------- Form akad baru --------------------------- */

function AkadFormDialog({
  open,
  onOpenChange,
  investors,
  defaultNisbahPengelola,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  investors: { id: string; nama: string }[]
  defaultNisbahPengelola: number
}) {
  const [investorId, setInvestorId] = React.useState('')
  const [nilaiInvestasi, setNilaiInvestasi] = React.useState(0)
  const [tanpaBatas, setTanpaBatas] = React.useState(false)
  const [nisbahInvestor, setNisbahInvestor] = React.useState('')
  const [tanggal, setTanggal] = React.useState(todayJakarta())
  const [tenor, setTenor] = React.useState<string>('')
  const [catatan, setCatatan] = React.useState('')
  const [openInvestorBaru, setOpenInvestorBaru] = React.useState(false)
  const [namaBaru, setNamaBaru] = React.useState('')
  const [tlpBaru, setTlpBaru] = React.useState('')

  const nisbahInvestorNum = Number(nisbahInvestor)
  const nisbahValid =
    nisbahInvestor !== '' && nisbahInvestorNum >= 0 && nisbahInvestorNum <= 100
  const nisbahPengelolaNum = nisbahValid ? Math.round((100 - nisbahInvestorNum) * 100) / 100 : null

  React.useEffect(() => {
    if (!open) return
    setInvestorId('')
    setNilaiInvestasi(0)
    setTanpaBatas(false)
    setNisbahInvestor(String(100 - defaultNisbahPengelola))
    setTanggal(todayJakarta())
    setTenor('')
    setCatatan('')
  }, [open, defaultNisbahPengelola])

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Akad Investor Baru"
        description="Nilai investasi dan nisbah sesuai kesepakatan dengan investor ini — tanggal akad berlaku sebagai tanggal mulai kesepakatan."
        submitLabel="Simpan Akad"
        successMessage="Akad dibuat dengan status Menunggu Dana"
        disabled={!investorId || (!tanpaBatas && nilaiInvestasi <= 0) || !nisbahValid}
        onSubmit={() =>
          buatAkad({
            investor_id: investorId,
            nilai_investasi: tanpaBatas ? null : nilaiInvestasi,
            nisbah_investor_pct: nisbahInvestorNum,
            nisbah_pengelola_pct: nisbahPengelolaNum,
            tanggal_akad: tanggal,
            tenor_bulan: tenor === '' ? null : Number(tenor),
            catatan,
          })
        }
      >
        <div className="space-y-4">
          <Field label="Investor" required htmlFor="pilih-investor">
            <SearchableSelect
              id="pilih-investor"
              options={investors.map((i) => ({ value: i.id, label: i.nama }))}
              value={investorId}
              onChange={setInvestorId}
              placeholder="Pilih investor"
              searchPlaceholder="Cari nama investor..."
              emptyText="Investor tidak ditemukan"
              footer={
                <button
                  type="button"
                  onClick={() => setOpenInvestorBaru(true)}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-label font-medium text-accent transition-colors hover:bg-accent-soft"
                >
                  <UserPlus className="size-4" />
                  Investor Baru
                </button>
              }
            />
          </Field>

          <Field label="Nilai Investasi" required={!tanpaBatas}>
            <div className="space-y-2">
              <MoneyInput
                value={nilaiInvestasi}
                onChange={setNilaiInvestasi}
                disabled={tanpaBatas}
              />
              <label className="flex items-center gap-2 text-label text-ink-muted">
                <Checkbox checked={tanpaBatas} onCheckedChange={(v) => setTanpaBatas(Boolean(v))} />
                Tanpa batas plafon (unlimited)
              </label>
            </div>
          </Field>

          <FormGrid>
            <Field label="Nisbah Investor (%)" required htmlFor="nisbah-investor">
              <Input
                id="nisbah-investor"
                type="number"
                min={0}
                max={100}
                value={nisbahInvestor}
                onChange={(e) => setNisbahInvestor(e.target.value)}
              />
            </Field>
            <Field
              label="Nisbah Pengelola (%)"
              hint="Otomatis, sisa dari nisbah investor"
            >
              <Input
                type="number"
                disabled
                value={nisbahPengelolaNum ?? ''}
              />
            </Field>
          </FormGrid>

          <FormGrid>
            <Field label="Tanggal Akad" required htmlFor="tgl-akad">
              <Input
                id="tgl-akad"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </Field>
            <Field label="Tenor (bulan)" hint="Opsional" htmlFor="tenor">
              <Input
                id="tenor"
                type="number"
                value={tenor}
                onChange={(e) => setTenor(e.target.value)}
              />
            </Field>
          </FormGrid>

          <Field label="Catatan" htmlFor="catatan-akad">
            <Textarea
              id="catatan-akad"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Kesepakatan tambahan, dll."
            />
          </Field>

          <p className="rounded-lg bg-warning-soft p-3 text-label text-warning-deep">
            Setelah disimpan, akad berstatus <strong>Menunggu Dana</strong>. Saldo investor baru
            bertambah setelah Anda klik <strong>Konfirmasi Dana Diterima</strong>.
          </p>
        </div>
      </FormDialog>

      <FormDialog
        open={openInvestorBaru}
        onOpenChange={(v) => {
          setOpenInvestorBaru(v)
          if (v) {
            setNamaBaru('')
            setTlpBaru('')
          }
        }}
        size="sm"
        title="Investor Baru"
        description="Data lengkap bisa dilengkapi nanti di menu Master Investor."
        successMessage="Investor baru ditambahkan"
        onSubmit={async () => {
          const res = await simpanInvestor({ nama: namaBaru, no_tlp: tlpBaru, is_active: true })
          if (res.ok && res.data?.id) setInvestorId(res.data.id)
          return res
        }}
      >
        <div className="space-y-4">
          <Field label="Nama Investor" required htmlFor="nama-inv-baru">
            <Input
              id="nama-inv-baru"
              value={namaBaru}
              onChange={(e) => setNamaBaru(e.target.value)}
            />
          </Field>
          <Field label="No. Telepon" htmlFor="tlp-inv-baru">
            <Input id="tlp-inv-baru" value={tlpBaru} onChange={(e) => setTlpBaru(e.target.value)} />
          </Field>
        </div>
      </FormDialog>
    </>
  )
}

/* ------------------------ Konfirmasi dana masuk ----------------------- */

function KonfirmasiDanaDialog({
  akad,
  open,
  onOpenChange,
}: {
  akad: Akad
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [tanggal, setTanggal] = React.useState(todayJakarta())
  const [jumlah, setJumlah] = React.useState(akad.nilai_investasi ?? 0)

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Konfirmasi Dana Diterima"
      description={`Akad ${akad.no_akad} — ${akad.investor_nama}`}
      submitLabel="Konfirmasi & Tambah Saldo"
      successMessage="Dana dikonfirmasi. Saldo investor sudah diperbarui."
      onSubmit={() =>
        konfirmasiDanaDiterima({
          contract_id: akad.id,
          tanggal_dana_diterima: tanggal,
          jumlah_diterima: jumlah,
        })
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-surface-alt p-4">
          <p className="mm-label-caps">Nilai akad</p>
          {akad.nilai_investasi === null ? (
            <p className="mt-1 text-card-title font-semibold text-ink-subtle">Tanpa batas</p>
          ) : (
            <Money value={akad.nilai_investasi} size="lg" className="mt-1 block" />
          )}
        </div>

        <Field label="Tanggal Terima Dana" required htmlFor="tgl-dana">
          <Input
            id="tgl-dana"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </Field>

        <Field
          label="Jumlah Diterima"
          required
          hint="Ubah kalau investor menyetor bertahap"
        >
          <MoneyInput value={jumlah} onChange={setJumlah} />
        </Field>

        <p className="rounded-lg bg-accent-soft p-3 text-label text-accent">
          Setelah dikonfirmasi, sistem membuat 1 entri mutasi <strong>Setoran</strong> sebesar{' '}
          {formatRupiah(jumlah)} dan saldo investor langsung bertambah.
        </p>
      </div>
    </FormDialog>
  )
}
