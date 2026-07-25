'use client'

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2, Eye } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/states'
import { Money } from '@/components/shared/money'
import { AktifBadge, StatusBadge } from '@/components/shared/status-badge'
import { RowActions } from '@/components/shared/row-actions'
import { useConfirm } from '@/components/shared/confirm-dialog'
import { FormDialog, FormGrid, useAksi } from '@/components/forms/form-dialog'
import { PhotoUpload } from '@/components/forms/photo-upload'
import { Button } from '@/components/ui/button'
import { Field, Input, MoneyInput, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/primitives'
import { formatAngka, formatPersen } from '@/lib/format'
import type { AksiHasil } from '@/app/actions/_helper'

/** Spesifikasi kolom — sengaja serializable supaya bisa dikirim dari Server Component. */
export type ColSpec = {
  key: string
  header: string
  kind?: 'text' | 'money' | 'number' | 'percent' | 'badge' | 'aktif' | 'label'
  align?: 'left' | 'right' | 'center'
  /** untuk kind 'label': peta nilai enum -> teks Indonesia */
  labelMap?: Record<string, string>
  sortable?: boolean
  hint?: string
}

export type FieldSpec = {
  name: string
  label: string
  kind:
    | 'text'
    | 'textarea'
    | 'money'
    | 'number'
    | 'percent'
    | 'select'
    | 'switch'
    | 'email'
    | 'tel'
    | 'date'
    | 'foto'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  fullWidth?: boolean
  hint?: string
  readOnly?: boolean
  /** Nilai otomatis = 100 - field sumber (dipakai nisbah pengelola). */
  komplemenDari?: string
  defaultValue?: string | number | boolean
}

export type MasterCrudProps<T extends { id: string }> = {
  entitas: string
  rows: T[]
  error?: string | null
  canWrite: boolean
  columns: ColSpec[]
  fields: FieldSpec[]
  searchKeys?: string[]
  filter?: { key: string; label: string; options: { value: string; label: string }[] }
  simpanAction: (input: unknown) => Promise<AksiHasil<{ id: string }>>
  hapusAction?: (id: string) => Promise<AksiHasil>
  emptyTitle: string
  emptyDescription: string
  /**
   * Basis URL halaman detail, mis. `/master/investor` → link jadi
   * `/master/investor/<id>`. Sengaja string (bukan function) karena prop ini
   * dikirim dari Server Component, dan function tidak bisa diserialisasi
   * melewati batas server/client.
   */
  detailBasePath?: string
  exportName: string
  /** Field tambahan yang selalu ikut terkirim saat simpan. */
  hiddenValues?: Record<string, unknown>
}

export function MasterCrud<T extends Record<string, any> & { id: string }>({
  entitas,
  rows,
  error,
  canWrite,
  columns,
  fields,
  searchKeys,
  filter,
  simpanAction,
  hapusAction,
  emptyTitle,
  emptyDescription,
  detailBasePath,
  exportName,
  hiddenValues,
}: MasterCrudProps<T>) {
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<T | null>(null)
  const [nilaiFilter, setNilaiFilter] = React.useState('semua')
  const [form, setForm] = React.useState<Record<string, any>>({})
  const { confirm, dialog } = useConfirm()
  const { jalankan } = useAksi()

  function bukaTambah() {
    setEditing(null)
    setForm(nilaiAwal(fields))
    setOpen(true)
  }

  function bukaEdit(row: T) {
    setEditing(row)
    setForm(
      Object.fromEntries(fields.map((f) => [f.name, row[f.name] ?? nilaiKosong(f)])) as Record<
        string,
        any
      >,
    )
    setOpen(true)
  }

  const dataTampil = React.useMemo(() => {
    if (!filter || nilaiFilter === 'semua') return rows
    return rows.filter((r) => String(r[filter.key]) === nilaiFilter)
  }, [rows, filter, nilaiFilter])

  const kolom = React.useMemo<ColumnDef<T, any>[]>(() => {
    const dasar: ColumnDef<T, any>[] = columns.map((c) => ({
      accessorKey: c.key,
      header: c.header,
      enableSorting: c.sortable !== false,
      meta: {
        align: c.align ?? (c.kind === 'money' || c.kind === 'number' || c.kind === 'percent' ? 'right' : 'left'),
        exportValue: (row: T) => {
          const v = row[c.key]
          if (c.kind === 'aktif') return v ? 'Aktif' : 'Nonaktif'
          if (c.kind === 'label') return c.labelMap?.[String(v)] ?? v
          return v ?? ''
        },
      },
      cell: ({ row }) => renderSel(c, row.original),
    }))

    if (!canWrite && !detailBasePath) return dasar

    return [
      ...dasar,
      {
        id: 'aksi',
        header: '',
        enableSorting: false,
        meta: { align: 'right' as const },
        cell: ({ row }) => (
          <RowActions
            actions={[
              ...(detailBasePath
                ? [{ label: 'Lihat Detail', icon: Eye, href: `${detailBasePath}/${row.original.id}` }]
                : []),
              ...(canWrite
                ? [{ label: 'Edit', icon: Pencil, onSelect: () => bukaEdit(row.original) }]
                : []),
              ...(canWrite && hapusAction
                ? [
                    {
                      label: 'Hapus',
                      icon: Trash2,
                      tone: 'danger' as const,
                      onSelect: () =>
                        confirm({
                          title: `Hapus ${entitas} ini?`,
                          description: `Data "${row.original.nama ?? ''}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`,
                          confirmLabel: 'Ya, hapus',
                          onConfirm: async () => {
                            const ok = await jalankan(() => hapusAction(row.original.id))
                            if (!ok) throw new Error('')
                          },
                          successMessage: `${entitas} berhasil dihapus`,
                        }),
                    },
                  ]
                : []),
            ]}
          />
        ),
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, canWrite, hapusAction, detailBasePath, entitas])

  return (
    <>
      <DataTable<T>
        columns={kolom}
        data={dataTampil}
        searchKeys={searchKeys ?? ['nama']}
        searchPlaceholder={`Cari ${entitas.toLowerCase()}...`}
        exportName={exportName}
        error={error ?? null}
        filters={
          filter
            ? [
                {
                  id: filter.key,
                  label: filter.label,
                  value: nilaiFilter,
                  onChange: setNilaiFilter,
                  options: [{ value: 'semua', label: `Semua ${filter.label}` }, ...filter.options],
                },
              ]
            : undefined
        }
        toolbarAction={
          canWrite ? (
            <Button onClick={bukaTambah}>
              <Plus />
              <span className="hidden sm:inline">Tambah {entitas}</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          ) : null
        }
        empty={
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={
              canWrite ? (
                <Button onClick={bukaTambah}>
                  <Plus />
                  Tambah {entitas}
                </Button>
              ) : undefined
            }
          />
        }
        mobileCard={(row) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="truncate font-medium text-ink">{row.nama}</p>
              {columns.slice(1, 4).map((c) => (
                <p key={c.key} className="flex gap-1.5 text-label text-ink-muted">
                  <span className="text-ink-subtle">{c.header}:</span>
                  <span className="min-w-0 truncate">{renderSel(c, row)}</span>
                </p>
              ))}
            </div>
            {canWrite || detailBasePath ? (
              <RowActions
                actions={[
                  ...(detailBasePath
                    ? [{ label: 'Lihat Detail', icon: Eye, href: `${detailBasePath}/${row.id}` }]
                    : []),
                  ...(canWrite ? [{ label: 'Edit', icon: Pencil, onSelect: () => bukaEdit(row) }] : []),
                ]}
              />
            ) : null}
          </div>
        )}
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${entitas}` : `Tambah ${entitas}`}
        description={
          editing ? 'Ubah data lalu simpan.' : `Isi data ${entitas.toLowerCase()} baru di bawah ini.`
        }
        onSubmit={() =>
          simpanAction({
            ...(editing ? { id: editing.id } : {}),
            ...hiddenValues,
            ...form,
            ...nilaiKomplemen(fields, form),
          })
        }
      >
        <FormGrid>
          {fields.map((f) => (
            <FieldRender
              key={f.name}
              spec={f}
              value={form[f.name]}
              form={form}
              onChange={(v) => setForm((s) => ({ ...s, [f.name]: v }))}
            />
          ))}
        </FormGrid>
      </FormDialog>

      {dialog}
    </>
  )
}

/* ---------------------------- render sel ---------------------------- */

function renderSel<T extends Record<string, any>>(c: ColSpec, row: T): React.ReactNode {
  const v = row[c.key]
  switch (c.kind) {
    case 'money':
      return <Money value={v} />
    case 'number':
      return <span className="tnum">{formatAngka(v)}</span>
    case 'percent':
      return <span className="tnum">{formatPersen(v)}</span>
    case 'aktif':
      return <AktifBadge active={Boolean(v)} />
    case 'badge':
      return v ? <StatusBadge status={String(v)} /> : <span className="text-ink-subtle">-</span>
    case 'label':
      return <span>{c.labelMap?.[String(v)] ?? (v || '-')}</span>
    default:
      return v ? <span>{String(v)}</span> : <span className="text-ink-subtle">-</span>
  }
}

/* --------------------------- render field --------------------------- */

function FieldRender({
  spec,
  value,
  form,
  onChange,
}: {
  spec: FieldSpec
  value: any
  form: Record<string, any>
  onChange: (v: any) => void
}) {
  const id = `f-${spec.name}`

  if (spec.komplemenDari) {
    const sumber = Number(form[spec.komplemenDari] ?? 0)
    const komplemen = Math.round((100 - sumber) * 100) / 100
    return (
      <Field label={spec.label} hint="Terisi otomatis dari nisbah investor" className={spec.fullWidth ? 'sm:col-span-2' : ''}>
        <Input value={`${komplemen}`} readOnly className="bg-surface-alt" />
      </Field>
    )
  }

  const wrapper = (children: React.ReactNode) => (
    <Field
      label={spec.label}
      required={spec.required}
      hint={spec.hint}
      htmlFor={id}
      className={spec.fullWidth ? 'sm:col-span-2' : ''}
    >
      {children}
    </Field>
  )

  switch (spec.kind) {
    case 'textarea':
      return wrapper(
        <Textarea
          id={id}
          value={value ?? ''}
          placeholder={spec.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />,
      )
    case 'money':
      return wrapper(<MoneyInput id={id} value={Number(value ?? 0)} onChange={onChange} />)
    case 'number':
    case 'percent':
      return wrapper(
        <Input
          id={id}
          type="number"
          value={value ?? ''}
          placeholder={spec.placeholder}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />,
      )
    case 'select':
      return wrapper(
        <Select value={value ? String(value) : ''} onValueChange={onChange}>
          <SelectTrigger id={id}>
            <SelectValue placeholder={spec.placeholder ?? 'Pilih...'} />
          </SelectTrigger>
          <SelectContent>
            {spec.options?.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      )
    case 'date':
      return wrapper(
        <Input id={id} type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />,
      )
    case 'foto':
      return wrapper(
        <PhotoUpload value={Array.isArray(value) ? value : []} onChange={onChange} />,
      )
    case 'switch':
      return (
        <div className={spec.fullWidth ? 'sm:col-span-2' : ''}>
          <div className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5">
            <div>
              <p className="text-label font-medium text-ink">{spec.label}</p>
              {spec.hint ? <p className="text-label text-ink-muted">{spec.hint}</p> : null}
            </div>
            <Switch checked={Boolean(value)} onCheckedChange={onChange} />
          </div>
        </div>
      )
    default:
      return wrapper(
        <Input
          id={id}
          type={spec.kind === 'email' ? 'email' : spec.kind === 'tel' ? 'tel' : 'text'}
          value={value ?? ''}
          placeholder={spec.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />,
      )
  }
}

/** Isi field yang nilainya otomatis 100 - field sumber (nisbah pengelola). */
function nilaiKomplemen(fields: FieldSpec[], form: Record<string, any>) {
  const out: Record<string, number> = {}
  for (const f of fields) {
    if (!f.komplemenDari) continue
    const sumber = Number(form[f.komplemenDari] ?? 0)
    out[f.name] = Math.round((100 - sumber) * 100) / 100
  }
  return out
}

function nilaiAwal(fields: FieldSpec[]) {
  return Object.fromEntries(
    fields.map((f) => [f.name, f.defaultValue ?? nilaiKosong(f)]),
  ) as Record<string, any>
}

function nilaiKosong(f: FieldSpec) {
  if (f.kind === 'switch') return true
  if (f.kind === 'money') return 0
  if (f.kind === 'foto') return []
  if (f.kind === 'number' || f.kind === 'percent') return null
  return ''
}
