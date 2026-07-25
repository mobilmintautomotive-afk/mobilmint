import 'server-only'
import { createServerClient, supabaseEnv } from '@/lib/supabase/server'
import { errorMessage } from '@/lib/utils'

export type Hasil<T> = { data: T; error: string | null }

/** Batas baris yang ditarik per halaman list (PRD 03 aturan 5.6). */
export const LIST_LIMIT = 500

const PESAN_BELUM_SETUP =
  'Supabase belum terhubung. Isi NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local, lalu jalankan migration + seed.'

/**
 * Bungkus query supaya halaman selalu bisa dirender:
 * kalau gagal, kembalikan `fallback` + pesan error yang siap ditampilkan
 * di state error tabel (bukan melempar dan membuat halaman blank).
 */
export async function aman<T>(
  fn: (db: ReturnType<typeof createServerClient>) => Promise<T>,
  fallback: T,
): Promise<Hasil<T>> {
  if (!supabaseEnv().configured) {
    return { data: fallback, error: PESAN_BELUM_SETUP }
  }
  try {
    const db = createServerClient()
    const data = await fn(db)
    return { data, error: null }
  } catch (e) {
    return { data: fallback, error: errorMessage(e, 'Gagal mengambil data dari database.') }
  }
}

/** Lempar kalau PostgREST mengembalikan error. */
export function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return (res.data ?? []) as T
}

export function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Ubah array jadi Map berdasarkan key. */
export function indexBy<T, K extends keyof T>(rows: T[], key: K): Map<T[K], T> {
  return new Map(rows.map((r) => [r[key], r]))
}

/** Hitung jumlah kemunculan per key. */
export function countBy<T>(rows: T[], pick: (row: T) => string | null | undefined) {
  const m = new Map<string, number>()
  for (const r of rows) {
    const k = pick(r)
    if (!k) continue
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return m
}

/** Jumlahkan nilai per key. */
export function sumBy<T>(
  rows: T[],
  pick: (row: T) => string | null | undefined,
  value: (row: T) => number,
) {
  const m = new Map<string, number>()
  for (const r of rows) {
    const k = pick(r)
    if (!k) continue
    m.set(k, (m.get(k) ?? 0) + value(r))
  }
  return m
}
