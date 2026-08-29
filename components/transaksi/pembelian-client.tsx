'use client'

import * as React from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { CarFront, Loader2, Pencil, Plus, ShoppingCart } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/states'
import { Money } from '@/components/shared/money'
import { StatusBadge } from '@/components/shared/status-badge'
import { RowActions, type AksiBaris } from '@/components/shared/row-actions'
import { FormDialog, FormGrid } from '@/components/forms/form-dialog'
import { RincianBiayaRows } from '@/components/forms/rincian-biaya'
import { MobilFormDialog } from '@/components/master/mobil-form'
import { UrunDanaPanel, type BarisPendana } from './urun-dana-panel'
import { Button } from '@/components/ui/button'
import { Field, Input, MoneyInput, Textarea } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/select'
import { buatPembelian, perbaruiPembelian, getAlokasiPembelian } from '@/app/actions/purchases'
import { formatTanggal, todayJakarta } from '@/lib/format'
import { totalRincian, validasiAlokasi } from '@/lib/calc'
import { SUPPLIER_TYPE_LABEL } from '@/lib/constants'
import type { InvestorPendanaan } from '@/lib/queries/master'
import type { RincianBiaya } from '@/types/database'

type Pembelian = {
  id: string
  no_transaksi: string
  car_id: string
  tanggal_beli: string
  unit: string
  no_polisi: string | null
  status_unit: string | null
  supplier_id: string | null
  supplier_nama: string
  harga_beli: number
  biaya_lain: number
  rincian_biaya_lain: RincianBiaya[] | null
  total_modal: number
  catatan: string | null
}

type UnitOption = {
  id: string
  merek: string
  tipe: string
  tahun: number
  no_polisi: string | null
}

/** Unit yang sudah masuk siklus penjualan -- HPP-nya terkunci, pembelian tidak boleh diedit lagi. */
const STATUS_TERKUNCI = new Set(['TERJUAL', 'SELESAI'])

export function PembelianClient({
  rows,
  error,
  canWrite,
  unitTersedia,
  suppliers,
  saldoInvestor,
}: {
  rows: Pembelian[]
  error: string | null
  canWrite: boolean
  unitTersedia: UnitOption[]
  suppliers: { id: string; nama: string; tipe_supplier: string }[]
  saldoInvestor: InvestorPendanaan[]
}) {
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Pembelian | null>(null)

  const aksiUntuk = React.useCallback((row: Pembelian): AksiBaris[] => {
    const terkunci = STATUS_TERKUNCI.has(row.status_unit ?? '')
    return [
      {
        label: 'Edit',
        icon: Pencil,
        disabled: terkunci,
        alasan: 'Unit ini sudah terjual, HPP-nya sudah terkunci',
        onSelect: () => {
          setEditing(row)
          setOpen(true)
        },
      },
    ]
  }, [])

  const columns = React.useMemo<ColumnDef<Pembelian, any>[]>(
    () => [
      { accessorKey: 'no_transaksi', header: 'No. Transaksi' },
      {
        accessorKey: 'tanggal_beli',
        header: 'Tanggal',
        meta: { exportValue: (r: Pembelian) => r.tanggal_beli },
        cell: ({ getValue }) => formatTanggal(getValue() as string),
      },
      {
        accessorKey: 'unit',
        header: 'Unit',
        cell: ({ row }) => (
          <Link href={`/master/mobil/${row.original.car_id}`} className="min-w-0 hover:text-accent">
            <span className="block truncate font-medium">{row.original.unit}</span>
            <span className="block truncate text-label text-ink-muted">
              {row.original.no_polisi ?? '-'}
            </span>
          </Link>
        ),
      },
      { accessorKey: 'supplier_nama', header: 'Supplier' },
      {
        accessorKey: 'harga_beli',
        header: 'Harga Beli',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} />,
      },
      {
        accessorKey: 'biaya_lain',
        header: 'Biaya Lain',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} />,
      },
      {
        accessorKey: 'total_modal',
        header: 'Total Modal',
        meta: { align: 'right' as const },
        cell: ({ getValue }) => <Money value={getValue() as number} className="font-medium" />,
      },
      {
        accessorKey: 'status_unit',
        header: 'Status Unit',
        meta: { align: 'center' as const },
        cell: ({ getValue }) =>
          getValue() ? <StatusBadge status={getValue() as string} /> : <span>-</span>,
      },
      ...(canWrite
        ? [
            {
              id: 'aksi',
              header: '',
              enableSorting: false,
              meta: { align: 'right' as const },
              cell: ({ row }: any) => <RowActions actions={aksiUntuk(row.original)} />,
            } as ColumnDef<Pembelian, any>,
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canWrite],
  )

  return (
    <>
      <DataTable<Pembelian>
        columns={columns}
        data={rows}
        searchKeys={['no_transaksi', 'unit', 'supplier_nama', 'no_polisi']}
        searchPlaceholder="Cari no. transaksi, unit, atau supplier..."
        exportName="pembelian-mobil"
        error={error}
        toolbarAction={
          canWrite ? (
            <Button
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <Plus />
              <span className="hidden sm:inline">Pembelian Baru</span>
              <span className="sm:hidden">Baru</span>
            </Button>
          ) : null
        }
        empty={
          <EmptyState
            icon={ShoppingCart}
            title="Belum ada pembelian"
            description="Catat pembelian pertama untuk mulai mengisi stok dan mengalokasikan modal investor."
            action={
              canWrite ? (
                <Button
                  onClick={() => {
                    setEditing(null)
                    setOpen(true)
                  }}
                >
                  <Plus />
                  Pembelian Baru
                </Button>
              ) : undefined
            }
          />
        }
        mobileCard={(row) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/master/mobil/${row.car_id}`} className="min-w-0 hover:text-accent">
                <p className="truncate font-medium text-ink">{row.unit}</p>
                <p className="text-label text-ink-muted">
                  {row.no_transaksi} · {row.supplier_nama}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                {row.status_unit ? <StatusBadge status={row.status_unit} /> : null}
                {canWrite ? <RowActions actions={aksiUntuk(row)} /> : null}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-label text-ink-muted">{formatTanggal(row.tanggal_beli)}</span>
              <Money value={row.total_modal} className="font-medium" />
            </div>
          </div>
        )}
      />

      <PembelianFormDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setEditing(null)
        }}
        pembelian={editing}
        unitTersedia={unitTersedia}
        suppliers={suppliers}
        saldoInvestor={saldoInvestor}
      />
    </>
  )
}

/* --------------------- Form pembelian baru / edit --------------------- */

function PembelianFormDialog({
  open,
  onOpenChange,
  pembelian = null,
  unitTersedia,
  suppliers,
  saldoInvestor,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  pembelian?: Pembelian | null
  unitTersedia: UnitOption[]
  suppliers: { id: string; nama: string; tipe_supplier: string }[]
  saldoInvestor: InvestorPendanaan[]
}) {
  const [carId, setCarId] = React.useState('')
  const [supplierId, setSupplierId] = React.useState('')
  const [tanggal, setTanggal] = React.useState(todayJakarta())
  const [hargaBeli, setHargaBeli] = React.useState(0)
  const [biaya, setBiaya] = React.useState<RincianBiaya[]>([])
  const [catatan, setCatatan] = React.useState('')
  const [openUnitBaru, setOpenUnitBaru] = React.useState(false)
  const [memuatAlokasi, setMemuatAlokasi] = React.useState(false)

  // Mekanisme urun dana: investor utama dulu (rows[0]), baru bisa tambah
  // investor lain — dibatasi ke yang nisbahnya sama persis (lihat UrunDanaPanel).
  const [pendana, setPendana] = React.useState<BarisPendana[]>([])

  const totalModal = Math.round(hargaBeli) + totalRincian(biaya)
  const validasi = validasiAlokasi(totalModal, pendana)
  const totalSaldoPendana = pendana.reduce((s, r) => s + r.saldo, 0)
  const cukup = totalSaldoPendana >= totalModal

  // Alokasi lama (mentah, dari server) -- dipakai buat "membalikkan" saldo
  // yang ditampilkan di panel, BUKAN state yang diedit langsung (itu
  // tugasnya `pendana`). Dipisah supaya kalau admin ganti/tambah investor
  // baru lewat dropdown "Investor Utama" / "+ Tambah Investor", saldo yang
  // ditampilkan tetap benar (saldo saat ini + porsi yang sudah dipakai
  // unit ini, kalau investor itu memang salah satu pendana lama).
  const [alokasiLama, setAlokasiLama] = React.useState<
    { investor_id: string; amount: number }[]
  >([])

  // Waktu edit, alokasi LAMA punya unit ini perlu "dibalikin dulu" secara
  // tampilan supaya saldo yang kelihatan di panel bukan saldo yang sudah
  // terpotong oleh pembelian ini sendiri (nanti dobel-hitung kurangnya).
  // Alokasi RPC-nya sendiri sudah aman (lihat update_purchase_funding),
  // ini cuma soal saldo yang ditampilkan di panel.
  const saldoUntukPanel = React.useMemo(() => {
    if (!pembelian || alokasiLama.length === 0) return saldoInvestor
    const map = new Map(alokasiLama.map((a) => [a.investor_id, a.amount]))
    return saldoInvestor.map((inv) => {
      const lama = map.get(inv.investor_id)
      return lama ? { ...inv, saldo: inv.saldo + lama } : inv
    })
  }, [saldoInvestor, pembelian, alokasiLama])

  React.useEffect(() => {
    if (!open) return
    setCarId(pembelian?.car_id ?? '')
    setSupplierId(pembelian?.supplier_id ?? '')
    setTanggal(pembelian?.tanggal_beli ?? todayJakarta())
    setHargaBeli(pembelian?.harga_beli ?? 0)
    setBiaya(pembelian?.rincian_biaya_lain ?? [])
    setCatatan(pembelian?.catatan ?? '')

    if (!pembelian) {
      setPendana([])
      setAlokasiLama([])
      return
    }

    // Edit: ambil alokasi yang sudah tersimpan, lalu "balikin" saldo yang
    // ditampilkan (saldo saat ini + porsi yang sudah dipakai unit ini)
    // supaya panel Sumber Dana menunjukkan saldo yang sebenarnya tersedia
    // kalau alokasi lama ini dilepas dulu.
    setMemuatAlokasi(true)
    getAlokasiPembelian(pembelian.id).then((res) => {
      if (!res.ok) {
        setPendana([])
        setAlokasiLama([])
        setMemuatAlokasi(false)
        return
      }
      const data = res.data ?? []
      setAlokasiLama(data.map((a) => ({ investor_id: a.investor_id, amount: a.amount })))
      setPendana(
        data.map((a) => {
          const inv = saldoInvestor.find((i) => i.investor_id === a.investor_id)
          return {
            investor_id: a.investor_id,
            nama: a.nama,
            saldo: (inv?.saldo ?? 0) + a.amount,
            amount: a.amount,
          }
        }),
      )
      setMemuatAlokasi(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pembelian])

  const bisaSimpan =
    Boolean(carId) &&
    totalModal > 0 &&
    pendana.length > 0 &&
    cukup &&
    validasi.valid &&
    !memuatAlokasi

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        size="lg"
        title={pembelian ? `Edit Pembelian ${pembelian.no_transaksi}` : 'Pembelian Mobil Baru'}
        description={
          pembelian
            ? 'Unit tidak bisa diganti dari sini. Ubah alokasi Sumber Dana kalau perlu — saldo investor dihitung ulang otomatis, tidak dobel potong.'
            : 'Cek panel Sumber Dana di bawah sebelum menyimpan — dana investor akan langsung terpotong.'
        }
        submitLabel={pembelian ? 'Simpan Perubahan' : 'Simpan Pembelian'}
        successMessage={
          pembelian
            ? 'Perubahan pembelian tersimpan'
            : 'Pembelian tersimpan dan modal investor sudah dialokasikan'
        }
        disabled={!bisaSimpan}
        onSubmit={() => {
          const payload = {
            supplier_id: supplierId || null,
            tanggal_beli: tanggal,
            harga_beli: hargaBeli,
            rincian_biaya_lain: biaya.filter((b) => b.nama && b.nominal > 0),
            catatan,
            alokasi: pendana
              .filter((p) => p.amount > 0)
              .map((p) => ({ investor_id: p.investor_id, amount: p.amount })),
          }
          return pembelian
            ? perbaruiPembelian({ id: pembelian.id, ...payload })
            : buatPembelian({ car_id: carId, ...payload })
        }}
      >
        <div className="space-y-5">
          <FormGrid>
            <Field label="Unit Mobil" required htmlFor="pilih-unit" className="sm:col-span-2">
              {pembelian ? (
                <div className="flex h-10 items-center rounded-[10px] border border-line bg-surface-alt px-3 text-body text-ink-muted">
                  {pembelian.unit} {pembelian.no_polisi ? `· ${pembelian.no_polisi}` : ''}
                </div>
              ) : (
                <SearchableSelect
                  id="pilih-unit"
                  options={unitTersedia.map((u) => ({
                    value: u.id,
                    label: `${u.merek} ${u.tipe} ${u.tahun}`,
                    keterangan: u.no_polisi ?? 'Tanpa no. polisi',
                  }))}
                  value={carId}
                  onChange={setCarId}
                  placeholder="Pilih unit yang dibeli"
                  searchPlaceholder="Cari merek, tipe..."
                  emptyText="Semua unit sudah punya transaksi pembelian"
                  footer={
                    <button
                      type="button"
                      onClick={() => setOpenUnitBaru(true)}
                      className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-label font-medium text-accent transition-colors hover:bg-accent-soft"
                    >
                      <CarFront className="size-4" />
                      Input Mobil Baru
                    </button>
                  }
                />
              )}
            </Field>

            <Field label="Supplier" htmlFor="pilih-supplier">
              <SearchableSelect
                id="pilih-supplier"
                options={suppliers.map((s) => ({
                  value: s.id,
                  label: s.nama,
                  keterangan:
                    SUPPLIER_TYPE_LABEL[s.tipe_supplier as keyof typeof SUPPLIER_TYPE_LABEL],
                }))}
                value={supplierId}
                onChange={setSupplierId}
                placeholder="Pilih supplier"
              />
            </Field>

            <Field label="Tanggal Pembelian" required htmlFor="tgl-beli">
              <Input
                id="tgl-beli"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </Field>

            <Field label="Harga Beli" required className="sm:col-span-2">
              <MoneyInput value={hargaBeli} onChange={setHargaBeli} />
            </Field>
          </FormGrid>

          <RincianBiayaRows
            rows={biaya}
            onChange={setBiaya}
            placeholder="Contoh: biaya lelang, mutasi, derek"
          />

          <div className="flex items-center justify-between rounded-lg bg-cta px-4 py-3 text-white">
            <span className="text-label">Total Modal Unit</span>
            <span className="text-card-title tnum font-bold">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                maximumFractionDigits: 0,
              }).format(totalModal)}
            </span>
          </div>

          {memuatAlokasi ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-surface-alt p-6 text-label text-ink-muted">
              <Loader2 className="size-4 animate-spin" />
              Memuat alokasi Sumber Dana yang sudah tersimpan...
            </div>
          ) : (
            <UrunDanaPanel
              totalModal={totalModal}
              daftarInvestor={saldoUntukPanel}
              rows={pendana}
              onChange={setPendana}
            />
          )}

          <Field label="Catatan" htmlFor="catatan-beli">
            <Textarea
              id="catatan-beli"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Kondisi saat dibeli, kesepakatan dengan supplier, dll."
            />
          </Field>
        </div>
      </FormDialog>

      <MobilFormDialog
        open={openUnitBaru}
        onOpenChange={setOpenUnitBaru}
        onSaved={(id) => setCarId(id)}
      />
    </>
  )
}
