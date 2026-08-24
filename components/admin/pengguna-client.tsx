'use client'

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Check, Copy, KeyRound, Pencil, ShieldCheck, UserMinus, UserPlus } from 'lucide-react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { daftarkanPengguna, perbaruiPengguna, resetPasswordPengguna } from '@/app/actions/users'
import { ubahStatusPengguna } from '@/app/actions/users'
import { simpanInvestor } from '@/app/actions/master'
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
  const [passwordBaru, setPasswordBaru] = React.useState<{ nama: string; password: string } | null>(
    null,
  )
  const { confirm, dialog } = useConfirm()
  const { jalankan } = useAksi()

  const data = React.useMemo(
    () => (fRole === 'semua' ? rows : rows.filter((r) => r.role === fRole)),
    [rows, fRole],
  )

  async function resetPassword(p: BarisPengguna) {
    confirm({
      title: 'Reset password akun ini?',
      description: `Password lama ${p.nama} akan diganti dengan password sementara baru. Dia wajib menggantinya sendiri saat login berikutnya.`,
      confirmLabel: 'Ya, reset',
      onConfirm: async () => {
        const res = await resetPasswordPengguna(p.id)
        if (!res.ok) throw new Error(res.error)
        setPasswordBaru({ nama: p.nama, password: res.data!.passwordSementara })
      },
    })
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
              {
                label: 'Reset Password',
                icon: KeyRound,
                onSelect: () => resetPassword(row.original),
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
            <UserPlus />
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
                <UserPlus />
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
        onPasswordSementara={(nama, password) => setPasswordBaru({ nama, password })}
      />

      <PasswordSementaraDialog info={passwordBaru} onOpenChange={() => setPasswordBaru(null)} />

      {dialog}
    </>
  )
}

function PasswordSementaraDialog({
  info,
  onOpenChange,
}: {
  info: { nama: string; password: string } | null
  onOpenChange: (v: boolean) => void
}) {
  const [tersalin, setTersalin] = React.useState(false)

  React.useEffect(() => {
    if (info) setTersalin(false)
  }, [info])

  function salin() {
    if (!info) return
    navigator.clipboard.writeText(info.password).then(() => {
      setTersalin(true)
      toast.success('Password disalin')
    })
  }

  return (
    <Dialog open={Boolean(info)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Password Sementara</DialogTitle>
          <DialogDescription>
            Bagikan password ini ke <strong>{info?.nama}</strong> secara pribadi (WhatsApp, dsb).
            Dia akan diminta ganti password sendiri saat login pertama. Password ini tidak
            ditampilkan lagi setelah dialog ini ditutup.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-line-strong bg-surface-alt px-4 py-3">
          <code className="text-body font-semibold tracking-wide text-ink">{info?.password}</code>
          <Button type="button" size="sm" variant="secondary" onClick={salin}>
            {tersalin ? <Check className="text-success" /> : <Copy />}
            {tersalin ? 'Tersalin' : 'Salin'}
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Selesai</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PenggunaFormDialog({
  open,
  onOpenChange,
  pengguna,
  investors,
  onPasswordSementara,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  pengguna: BarisPengguna | null
  investors: { id: string; nama: string; sudah_punya_akun: boolean }[]
  onPasswordSementara: (nama: string, password: string) => void
}) {
  const [nama, setNama] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<string>('investor')
  const [investorId, setInvestorId] = React.useState('')
  const [openInvestorBaru, setOpenInvestorBaru] = React.useState(false)
  const [namaBaru, setNamaBaru] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setNama(pengguna?.nama ?? '')
    setEmail(pengguna?.email ?? '')
    setRole(pengguna?.role ?? 'investor')
    setInvestorId(pengguna?.investor_id ?? '')
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
        description={
          pengguna
            ? 'Akun investor wajib dihubungkan ke data investor supaya dashboard-nya tahu data siapa yang ditampilkan.'
            : 'Akun login dibuat otomatis dengan password sementara — bagikan ke penggunanya setelah tersimpan.'
        }
        successMessage={pengguna ? 'Data pengguna tersimpan' : undefined}
        disabled={!nama || !email || (role === 'investor' && !investorId)}
        onSubmit={async () => {
          const payload = {
            ...(pengguna ? { id: pengguna.id } : {}),
            nama,
            email,
            role,
            investor_id: role === 'investor' ? investorId : null,
            is_active: pengguna?.is_active ?? true,
          }
          if (pengguna) return perbaruiPengguna(payload)

          const res = await daftarkanPengguna(payload)
          if (res.ok && res.data) onPasswordSementara(nama, res.data.passwordSementara)
          return res
        }}
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
