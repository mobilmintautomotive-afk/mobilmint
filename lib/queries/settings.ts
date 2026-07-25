import 'server-only'
import { aman, num } from './base'
import { AMBANG_UMUR_STOK } from '@/lib/constants'
import type { AppSettings, Profile } from '@/types/database'

const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  nama_perusahaan: 'MobilMint',
  logo_url: null,
  alamat: null,
  no_tlp: null,
  default_nisbah_pengelola: 35,
  ambang_umur_stok: AMBANG_UMUR_STOK,
  updated_at: new Date().toISOString(),
}

export async function getPengaturan() {
  const res = await aman<AppSettings>(async (db) => {
    const r = await db.from('app_settings').select('*').eq('id', 1).maybeSingle()
    if (r.error) throw new Error(r.error.message)
    if (!r.data) return DEFAULT_SETTINGS
    return {
      ...(r.data as any),
      default_nisbah_pengelola: num((r.data as any).default_nisbah_pengelola),
      ambang_umur_stok: num((r.data as any).ambang_umur_stok) || AMBANG_UMUR_STOK,
    }
  }, DEFAULT_SETTINGS)
  return res
}

export async function getDaftarPengguna() {
  return aman(async (db) => {
    const r = await db
      .from('profiles')
      .select('*, investors(nama)')
      .order('created_at', { ascending: false })
    if (r.error) throw new Error(r.error.message)
    return ((r.data ?? []) as any[]).map((p) => ({
      ...(p as Profile),
      investor_nama: p.investors?.nama ?? null,
    }))
  }, [] as (Profile & { investor_nama: string | null })[])
}

/** Investor yang belum punya akun — dipakai form Kelola Akses. */
export async function getInvestorTanpaAkun() {
  return aman(async (db) => {
    const [inv, prof] = await Promise.all([
      db.from('investors').select('id, nama').eq('is_active', true).order('nama'),
      db.from('profiles').select('investor_id').not('investor_id', 'is', null),
    ])
    if (inv.error) throw new Error(inv.error.message)
    const dipakai = new Set(((prof.data ?? []) as any[]).map((p) => p.investor_id))
    return ((inv.data ?? []) as any[]).map((i) => ({
      ...i,
      sudah_punya_akun: dipakai.has(i.id),
    }))
  }, [] as { id: string; nama: string; sudah_punya_akun: boolean }[])
}
