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
import { SearchableSelect } from '@/components/ui/select'
import { buatAkad, konfirmasiDanaDiterima, batalkanAkad } from '@/app/actions/contracts'
import { simpanInvestor } from '@/app/actions/master'
import { formatPersen, formatRupiah, formatTanggal, todayJakarta } from '@/lib/format'

type Akad = {
  id: string
  no_akad: string
  investor_id: string
  tier_id: string
  investor_nama: string
  golongan: string
  nilai_investasi: number
  nisbah_investor_pct: number
  tanggal_akad: string
  tanggal_dana_diterima: string | null
  jumlah_diterima: number | null
  status: string
}

type Tier = {
  id: string
  nama_golongan: string
  nilai_investasi: number
  nisbah_investor_pct: number
  nisbah_pengelola_pct: number
  tenor_bulan: number | null
}

export function AkadClient({
  rows,
  error,
  canWrite,
  investors,
  tiers,
}: {
  rows: Akad[]
  error: string | null
  canWrite: boolean
  investors: { id: string; nama: string }[]
  tiers: Tier[]
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
      { accessorKey: 'golongan', header: 'Golongan' },
      {
        accessorKey: 'nilai_investasi',
        header: 'Nilai Investasi',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} />,
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
        searchKeys={['no_akad', 'investor_nama', 'golongan']}
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
                  {row.no_akad} · {row.golongan}
                </p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-label text-ink-muted">{formatTanggal(row.tanggal_akad)}</span>
              <Money value={row.nilai_investasi} className="font-medium" />
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
        tiers={tiers}
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
  tiers,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  investors: { id: string; nama: string }[]
  tiers: Tier[]
}) {
  const [investorId, setInvestorId] = React.useState('')
  const [tierId, setTierId] = React.useState('')
  const [tanggal, setTanggal] = React.useState(todayJakarta())
  const [tenor, setTenor] = React.useState<string>('')
  const [catatan, setCatatan] = React.useState('')
  const [openInvestorBaru, setOpenInvestorBaru] = React.useState(false)
  const [namaBaru, setNamaBaru] = React.useState('')
  const [tlpBaru, setTlpBaru] = React.useState('')

  const tier = tiers.find((t) => t.id === tierId)

  React.useEffect(() => {
    if (!open) return
    setInvestorId('')
    setTierId('')
    setTanggal(todayJakarta())
    setTenor('')
    setCatatan('')
  }, [open])

  React.useEffect(() => {
    if (tier?.tenor_bulan != null) setTenor(String(tier.tenor_bulan))
  }, [tier])

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Akad Investor Baru"
        description="Nilai investasi dan nisbah terisi otomatis dari golongan yang dipilih."
        submitLabel="Simpan Akad"
        successMessage="Akad dibuat dengan status Menunggu Dana"
        disabled={!investorId || !tierId}
        onSubmit={() =>
          buatAkad({
            investor_id: investorId,
            tier_id: tierId,
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

          <Field label="Golongan Investasi" required htmlFor="pilih-golongan">
            <SearchableSelect
              id="pilih-golongan"
              options={tiers.map((t) => ({
                value: t.id,
                label: t.nama_golongan,
                keterangan: `${formatRupiah(t.nilai_investasi)} · nisbah investor ${formatPersen(t.nisbah_investor_pct)}`,
              }))}
              value={tierId}
              onChange={setTierId}
              placeholder="Pilih golongan"
              emptyText="Belum ada golongan aktif"
            />
          </Field>

          {tier ? (
            <div className="grid gap-3 rounded-lg bg-accent-soft p-4 sm:grid-cols-3">
              <RingkasTier label="Nilai Investasi" value={formatRupiah(tier.nilai_investasi)} />
              <RingkasTier label="Nisbah Investor" value={formatPersen(tier.nisbah_investor_pct)} />
              <RingkasTier label="Nisbah Pengelola" value={formatPersen(tier.nisbah_pengelola_pct)} />
            </div>
          ) : null}

          <FormGrid>
            <Field label="Tanggal Akad" required htmlFor="tgl-akad">
              <Input
                id="tgl-akad"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </Field>
            <Field label="Tenor (bulan)" hint="Terisi dari golongan, boleh diubah" htmlFor="tenor">
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

function RingkasTier({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caps uppercase text-accent/70">{label}</p>
      <p className="mt-0.5 font-semibold tnum text-accent">{value}</p>
    </div>
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
  const [jumlah, setJumlah] = React.useState(akad.nilai_investasi)

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
          <Money value={akad.nilai_investasi} size="lg" className="mt-1 block" />
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
