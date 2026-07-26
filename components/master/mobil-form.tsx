'use client'

import * as React from 'react'
import { FormDialog, FormGrid } from '@/components/forms/form-dialog'
import { PhotoUpload } from '@/components/forms/photo-upload'
import { Field, Input, Textarea } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SearchableSelect,
} from '@/components/ui/select'
import { simpanMobil } from '@/app/actions/master'
import { MEREK_MOBIL_UMUM, TRANSMISI_LABEL } from '@/lib/constants'
import type { Car, CarOverview } from '@/types/database'

type FormMobil = {
  merek: string
  tipe: string
  tahun: string
  warna: string
  no_polisi: string
  no_rangka: string
  no_mesin: string
  transmisi: string
  kilometer: string
  tanggal_pajak: string
  catatan: string
  foto_urls: string[]
}

const kosong: FormMobil = {
  merek: '',
  tipe: '',
  tahun: '',
  warna: '',
  no_polisi: '',
  no_rangka: '',
  no_mesin: '',
  transmisi: '',
  kilometer: '',
  tanggal_pajak: '',
  catatan: '',
  foto_urls: [],
}

/**
 * Form unit mobil. Dipakai di halaman Master Mobil dan (mode inline)
 * di form pembelian lewat prop `onSaved`.
 */
export function MobilFormDialog({
  open,
  onOpenChange,
  mobil,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  mobil?: Car | CarOverview | null
  /** dipanggil dengan id unit yang baru dibuat */
  onSaved?: (id: string) => void
}) {
  const [form, setForm] = React.useState<FormMobil>(kosong)

  React.useEffect(() => {
    if (!open) return
    setForm(
      mobil
        ? {
            merek: mobil.merek ?? '',
            tipe: mobil.tipe ?? '',
            tahun: String(mobil.tahun ?? ''),
            warna: mobil.warna ?? '',
            no_polisi: mobil.no_polisi ?? '',
            no_rangka: mobil.no_rangka ?? '',
            no_mesin: mobil.no_mesin ?? '',
            transmisi: mobil.transmisi ?? '',
            kilometer: mobil.kilometer != null ? String(mobil.kilometer) : '',
            tanggal_pajak: mobil.tanggal_pajak ?? '',
            catatan: mobil.catatan ?? '',
            foto_urls: mobil.foto_urls ?? [],
          }
        : kosong,
    )
  }, [open, mobil])

  const set = (k: keyof FormMobil, v: any) => setForm((s) => ({ ...s, [k]: v }))

  // Merek bukan tabel master tersendiri (cuma kolom teks di `cars`), jadi
  // merek custom yang sudah tersimpan tetap disertakan supaya tetap
  // terpilih & bisa dipakai lagi — bukan cuma daftar umum yang tertutup.
  const merekOptions = React.useMemo(() => {
    const daftar: string[] = [...MEREK_MOBIL_UMUM]
    if (form.merek && !daftar.includes(form.merek)) daftar.unshift(form.merek)
    return daftar.map((m) => ({ value: m, label: m }))
  }, [form.merek])

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={mobil ? 'Edit Unit Mobil' : 'Tambah Unit Mobil'}
      description="Data unit ini dipakai di seluruh siklus: pembelian, perbaikan, stok, sampai penjualan."
      onSubmit={async () => {
        const res = await simpanMobil({
          ...(mobil ? { id: mobil.id } : {}),
          merek: form.merek,
          tipe: form.tipe,
          tahun: form.tahun,
          warna: form.warna,
          no_polisi: form.no_polisi,
          no_rangka: form.no_rangka,
          no_mesin: form.no_mesin,
          transmisi: form.transmisi || null,
          kilometer: form.kilometer === '' ? null : Number(form.kilometer),
          tanggal_pajak: form.tanggal_pajak || null,
          catatan: form.catatan,
          foto_urls: form.foto_urls,
        })
        if (res.ok && res.data?.id) onSaved?.(res.data.id)
        return res
      }}
    >
      <div className="space-y-5">
        <FormGrid>
          <Field label="Merek" required htmlFor="merek">
            <SearchableSelect
              id="merek"
              options={merekOptions}
              value={form.merek}
              onChange={(v) => set('merek', v)}
              placeholder="Pilih merek"
              searchPlaceholder="Cari atau ketik merek baru..."
              creatable
              createLabel={(q) => `Tambahkan merek "${q}"`}
            />
          </Field>
          <Field label="Tipe" required htmlFor="tipe">
            <Input
              id="tipe"
              value={form.tipe}
              onChange={(e) => set('tipe', e.target.value)}
              placeholder="Avanza G"
            />
          </Field>
          <Field label="Tahun" required htmlFor="tahun">
            <Input
              id="tahun"
              type="number"
              value={form.tahun}
              onChange={(e) => set('tahun', e.target.value)}
              placeholder="2019"
            />
          </Field>
          <Field label="Warna" htmlFor="warna">
            <Input id="warna" value={form.warna} onChange={(e) => set('warna', e.target.value)} />
          </Field>
          <Field label="Transmisi" htmlFor="transmisi">
            <Select value={form.transmisi} onValueChange={(v) => set('transmisi', v)}>
              <SelectTrigger id="transmisi">
                <SelectValue placeholder="Pilih transmisi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANUAL">{TRANSMISI_LABEL.MANUAL}</SelectItem>
                <SelectItem value="MATIC">{TRANSMISI_LABEL.MATIC}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Kilometer" htmlFor="kilometer">
            <Input
              id="kilometer"
              type="number"
              value={form.kilometer}
              onChange={(e) => set('kilometer', e.target.value)}
              placeholder="68000"
            />
          </Field>
        </FormGrid>

        <FormGrid>
          <Field label="No. Polisi" htmlFor="no_polisi">
            <Input
              id="no_polisi"
              value={form.no_polisi}
              onChange={(e) => set('no_polisi', e.target.value)}
              placeholder="B 1234 XYZ"
            />
          </Field>
          <Field label="Masa Berlaku Pajak (STNK)" htmlFor="tanggal_pajak">
            <Input
              id="tanggal_pajak"
              type="date"
              value={form.tanggal_pajak}
              onChange={(e) => set('tanggal_pajak', e.target.value)}
            />
          </Field>
          <Field label="No. Rangka" htmlFor="no_rangka">
            <Input
              id="no_rangka"
              value={form.no_rangka}
              onChange={(e) => set('no_rangka', e.target.value)}
            />
          </Field>
          <Field label="No. Mesin" htmlFor="no_mesin">
            <Input
              id="no_mesin"
              value={form.no_mesin}
              onChange={(e) => set('no_mesin', e.target.value)}
            />
          </Field>
        </FormGrid>

        <Field label="Foto Unit" hint="Maksimal 10 foto">
          <PhotoUpload value={form.foto_urls} onChange={(v) => set('foto_urls', v)} />
        </Field>

        <Field label="Catatan" htmlFor="catatan">
          <Textarea
            id="catatan"
            value={form.catatan}
            onChange={(e) => set('catatan', e.target.value)}
            placeholder="Kondisi unit, kelengkapan surat, dll."
          />
        </Field>
      </div>
    </FormDialog>
  )
}
