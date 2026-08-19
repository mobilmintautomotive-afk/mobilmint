'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { Card, CardDescription, CardTitle } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { FormGrid } from '@/components/forms/form-dialog'
import { ErrorState } from '@/components/shared/states'
import { simpanPengaturan } from '@/app/actions/master'
import { errorMessage } from '@/lib/utils'
import type { AppSettings } from '@/types/database'

export function PengaturanForm({
  setting,
  error,
}: {
  setting: AppSettings
  error: string | null
}) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [form, setForm] = React.useState({
    nama_perusahaan: setting.nama_perusahaan,
    alamat: setting.alamat ?? '',
    no_tlp: setting.no_tlp ?? '',
    logo_url: setting.logo_url ?? '',
    default_nisbah_pengelola: String(setting.default_nisbah_pengelola),
    ambang_umur_stok: String(setting.ambang_umur_stok),
  })

  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }))

  async function simpan(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await simpanPengaturan({
        ...form,
        default_nisbah_pengelola: Number(form.default_nisbah_pengelola),
        ambang_umur_stok: Number(form.ambang_umur_stok),
      })
      if (res.ok) {
        toast.success('Pengaturan tersimpan')
        router.refresh()
      } else {
        toast.error(res.error)
      }
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <div className="mm-card">
        <ErrorState description={error} />
      </div>
    )
  }

  return (
    <form onSubmit={simpan} className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardTitle>Profil Perusahaan</CardTitle>
        <CardDescription className="mb-4">
          Dipakai sebagai kop di laporan PDF yang dikirim ke investor.
        </CardDescription>

        <div className="space-y-4">
          <Field label="Nama Perusahaan" required htmlFor="nama-perusahaan">
            <Input
              id="nama-perusahaan"
              value={form.nama_perusahaan}
              onChange={(e) => set('nama_perusahaan', e.target.value)}
            />
          </Field>

          <Field label="Alamat" htmlFor="alamat-perusahaan">
            <Textarea
              id="alamat-perusahaan"
              value={form.alamat}
              onChange={(e) => set('alamat', e.target.value)}
            />
          </Field>

          <FormGrid>
            <Field label="No. Telepon" htmlFor="tlp-perusahaan">
              <Input
                id="tlp-perusahaan"
                value={form.no_tlp}
                onChange={(e) => set('no_tlp', e.target.value)}
              />
            </Field>
            <Field label="URL Logo" hint="Opsional, untuk kop laporan" htmlFor="logo-perusahaan">
              <Input
                id="logo-perusahaan"
                value={form.logo_url}
                onChange={(e) => set('logo_url', e.target.value)}
                placeholder="https://..."
              />
            </Field>
          </FormGrid>
        </div>
      </Card>

      <Card>
        <CardTitle>Aturan Operasional</CardTitle>
        <CardDescription className="mb-4">
          Nilai default yang dipakai di seluruh aplikasi.
        </CardDescription>

        <div className="space-y-4">
          <Field
            label="Default Nisbah Pengelola (%)"
            hint="Dipakai sebagai saran nisbah pengelola saat membuat akad baru"
            htmlFor="nisbah-default"
          >
            <Input
              id="nisbah-default"
              type="number"
              value={form.default_nisbah_pengelola}
              onChange={(e) => set('default_nisbah_pengelola', e.target.value)}
            />
          </Field>

          <Field
            label="Ambang Peringatan Umur Stok (hari)"
            hint="Unit yang lebih lama dari ini ditandai merah di halaman Stock"
            htmlFor="ambang-stok"
          >
            <Input
              id="ambang-stok"
              type="number"
              value={form.ambang_umur_stok}
              onChange={(e) => set('ambang_umur_stok', e.target.value)}
            />
          </Field>

          <div className="rounded-lg bg-surface-alt p-4">
            <p className="text-label font-medium text-ink">Format penomoran dokumen</p>
            <ul className="mt-2 space-y-1 text-label text-ink-muted">
              <li>
                Akad: <code>AKD-YYYYMM-0001</code>
              </li>
              <li>
                Pembelian: <code>BLI-YYYYMM-0001</code>
              </li>
              <li>
                Penjualan: <code>JUL-YYYYMM-0001</code>
              </li>
              <li>
                Bagi hasil: <code>BGH-YYYYMM-0001</code>
              </li>
            </ul>
            <p className="mt-2 text-label text-ink-subtle">
              Nomor digenerate otomatis di server dengan counter per bulan.
            </p>
          </div>
        </div>
      </Card>

      <div className="lg:col-span-2">
        <Button type="submit" loading={loading}>
          <Save />
          Simpan Pengaturan
        </Button>
      </div>
    </form>
  )
}
