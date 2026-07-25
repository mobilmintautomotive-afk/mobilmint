'use client'

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Eye, KeyRound, Pencil, Plus, ShieldCheck, UserMinus, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/states'
import { AktifBadge, RoleBadge } from '@/components/shared/status-badge'
import { RowActions } from '@/components/shared/row-actions'
import { useConfirm } from '@/components/shared/confirm-dialog'
import { FormDialog, FormGrid, useAksi } from '@/components/forms/form-dialog'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import {
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { setDevRole } from '@/app/actions/dev-role'
import { simpanPengguna, ubahStatusPengguna, simpanInvestor } from '@/app/actions/master'
import { USER_ROLE, USER_ROLE_LABEL, type UserRole } from '@/lib/constants'
import { formatTanggal } from '@/lib/format'
import type { Profile } from '@/types/database'

type BarisPengguna = Profile & { investor_nama: string | null }

export function PenggunaClient({
  rows,
  error,
  investors,
}: {
  rows: BarisPengguna[]
  error: string | null
  investors: { id: string; nama: string; sudah_punya_akun: boolean }[]
}) {
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<BarisPengguna | null>(null)
  const [fRole, setFRole] = React.useState('semua')
  const { confirm, dialog } = useConfirm()
  const { jalankan } = useAksi()

  const data = React.useMemo(
    () => (fRole === 'semua' ? rows : rows.filter((r) => r.role === fRole)),
    [rows, fRole],
  )

  async function masukSebagai(p: BarisPengguna) {
    if (!p.investor_id) return
    await setDevRole('investor', p.investor_id)
    toast.success(`Sekarang melihat sebagai ${p.nama}`)
    window.location.href = '/investor'
  }

  const columns = React.useMemo<ColumnDef<BarisPengguna, any>[]>(
    () => [
      { accessorKey: 'nama', header: 'Nama' },
      { accessorKey: 'email', header: 'Email' },
      {
        accessorKey: 'role',
        header: 'Role',
        meta: {
          align: 'center' as const,
          exportValue: (r: BarisPengguna) => USER_ROLE_LABEL[r.role],
        },
        cell: ({ getValue }) => <RoleBadge role={getValue() as UserRole} />,
      },
      {
        accessorKey: 'investor_nama',
        header: 'Terhubung ke Investor',
        cell: ({ getValue }) => getValue() || <span className="text-ink-subtle">-</span>,
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        meta: {
          align: 'center' as const,
          exportValue: (r: BarisPengguna) => (r.is_active ? 'Aktif' : 'Nonaktif'),
        },
        cell: ({ getValue }) => <AktifBadge active={Boolean(getValue())} />,
      },
      {
        accessorKey: 'last_login_at',
        header: 'Terakhir Login',
        meta: { exportValue: (r: BarisPengguna) => r.last_login_at ?? '' },
        cell: ({ getValue }) =>
          getValue() ? (
            formatTanggal(getValue() as string)
          ) : (
            <span className="text-ink-subtle">Belum pernah</span>
          ),
      },
      {
        id: 'aksi',
        header: '',
        enableSorting: false,
        meta: { align: 'right' as const },
        cell: ({ row }) => (
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
              ...(row.original.role === 'investor' && row.original.investor_id
                ? [
                    {
                      label: 'Masuk sebagai',
                      icon: Eye,
                      onSelect: () => masukSebagai(row.original),
                    },
                  ]
                : []),
              {
                label: 'Reset Password',
                icon: KeyRound,
                disabled: true,
                alasan: 'Tersedia setelah Supabase Auth aktif (Fase 5)',
                onSelect: () => {},
              },
              {
                label: row.original.is_active ? 'Nonaktifkan' : 'Aktifkan kembali',
                icon: UserMinus,
                tone: row.original.is_active ? ('danger' as const) : undefined,
                onSelect: () =>
                  confirm({
                    title: row.original.is_active ? 'Nonaktifkan akun ini?' : 'Aktifkan akun ini?',
                    description: row.original.is_active
                      ? `${row.original.nama} tidak akan bisa login, tapi datanya tetap tersimpan.`
                      : `${row.original.nama} bisa login kembali.`,
                    confirmLabel: 'Ya, lanjutkan',
                    variant: row.original.is_active ? 'destructive' : 'primary',
                    successMessage: 'Status akun diperbarui',
                    onConfirm: async () => {
                      const ok = await jalankan(() =>
                        ubahStatusPengguna(row.original.id, !row.original.is_active),
                      )
                      if (!ok) throw new Error('')
                    },
                  }),
              },
            ]}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <>
      <DataTable<BarisPengguna>
        columns={columns}
        data={data}
        searchKeys={['nama', 'email', 'investor_nama']}
        searchPlaceholder="Cari nama atau email..."
        exportName="pengguna"
        error={error}
        filters={[
          {
            id: 'role',
            label: 'Role',
            value: fRole,
            onChange: setFRole,
            options: [
              { value: 'semua', label: 'Semua Role' },
              ...USER_ROLE.map((r) => ({ value: r, label: USER_ROLE_LABEL[r] })),
            ],
          },
        ]}
        toolbarAction={
          <Button
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            <Plus />
            <span className="hidden sm:inline">Tambah Pengguna</span>
            <span className="sm:hidden">Tambah</span>
          </Button>
        }
        empty={
          <EmptyState
            icon={ShieldCheck}
            title="Belum ada pengguna"
            description="Daftarkan akun admin, holding, dan investor di sini."
            action={
              <Button
                onClick={() => {
                  setEditing(null)
                  setOpen(true)
                }}
              >
                <Plus />
                Tambah Pengguna
              </Button>
            }
          />
        }
        mobileCard={(row) => (
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{row.nama}</p>
                <p className="truncate text-label text-ink-muted">{row.email}</p>
              </div>
              <RoleBadge role={row.role} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-label text-ink-muted">{row.investor_nama ?? '-'}</span>
              <AktifBadge active={row.is_active} />
            </div>
          </div>
        )}
      />

      <PenggunaFormDialog
        open={open}
        onOpenChange={setOpen}
        pengguna={editing}
        investors={investors}
      />
      {dialog}
    </>
  )
}

function PenggunaFormDialog({
  open,
  onOpenChange,
  pengguna,
  investors,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  pengguna: BarisPengguna | null
  investors: { id: string; nama: string; sudah_punya_akun: boolean }[]
}) {
  const [nama, setNama] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<string>('investor')
  const [investorId, setInvestorId] = React.useState('')
  const [metode, setMetode] = React.useState<'undangan' | 'password'>('undangan')
  const [openInvestorBaru, setOpenInvestorBaru] = React.useState(false)
  const [namaBaru, setNamaBaru] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setNama(pengguna?.nama ?? '')
    setEmail(pengguna?.email ?? '')
    setRole(pengguna?.role ?? 'investor')
    setInvestorId(pengguna?.investor_id ?? '')
    setMetode('undangan')
  }, [open, pengguna])

  // Investor yang belum punya akun + investor yang sedang diedit
  const opsiInvestor = investors
    .filter((i) => !i.sudah_punya_akun || i.id === pengguna?.investor_id)
    .map((i) => ({ value: i.id, label: i.nama }))

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={pengguna ? 'Edit Pengguna' : 'Tambah Pengguna'}
        description="Akun investor wajib dihubungkan ke data investor supaya dashboard-nya tahu data siapa yang ditampilkan."
        successMessage="Data pengguna tersimpan"
        disabled={!nama || !email || (role === 'investor' && !investorId)}
        onSubmit={() =>
          simpanPengguna({
            ...(pengguna ? { id: pengguna.id } : {}),
            nama,
            email,
            role,
            investor_id: role === 'investor' ? investorId : null,
            is_active: pengguna?.is_active ?? true,
          })
        }
      >
        <div className="space-y-4">
          <FormGrid>
            <Field label="Nama Lengkap" required htmlFor="nama-user">
              <Input id="nama-user" value={nama} onChange={(e) => setNama(e.target.value)} />
            </Field>
            <Field label="Email" required htmlFor="email-user">
              <Input
                id="email-user"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
              />
            </Field>
          </FormGrid>

          <Field label="Role" required htmlFor="role-user">
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role-user">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLE.map((r) => (
                  <SelectItem key={r} value={r}>
                    {USER_ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {role === 'investor' ? (
            <Field label="Hubungkan ke Data Investor" required htmlFor="link-investor">
              <SearchableSelect
                id="link-investor"
                options={opsiInvestor}
                value={investorId}
                onChange={setInvestorId}
                placeholder="Pilih data investor"
                emptyText="Semua investor sudah punya akun"
                footer={
                  <button
                    type="button"
                    onClick={() => setOpenInvestorBaru(true)}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-label font-medium text-accent transition-colors hover:bg-accent-soft"
                  >
                    <UserPlus className="size-4" />
                    Daftarkan Investor Baru
                  </button>
                }
              />
            </Field>
          ) : null}

          {!pengguna ? (
            <Field label="Metode Akses" hint="Aktif setelah Supabase Auth dipasang di Fase 5">
              <Select value={metode} onValueChange={(v) => setMetode(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="undangan">Kirim Undangan via Email</SelectItem>
                  <SelectItem value="password">Set Password Sementara</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          ) : null}
        </div>
      </FormDialog>

      <FormDialog
        open={openInvestorBaru}
        onOpenChange={(v) => {
          setOpenInvestorBaru(v)
          if (v) setNamaBaru('')
        }}
        size="sm"
        title="Daftarkan Investor Baru"
        successMessage="Investor baru ditambahkan"
        onSubmit={async () => {
          const res = await simpanInvestor({ nama: namaBaru, is_active: true })
          if (res.ok && res.data?.id) setInvestorId(res.data.id)
          return res
        }}
      >
        <Field label="Nama Investor" required htmlFor="nama-inv-akses">
          <Input
            id="nama-inv-akses"
            value={namaBaru}
            onChange={(e) => setNamaBaru(e.target.value)}
          />
        </Field>
      </FormDialog>
    </>
  )
}
