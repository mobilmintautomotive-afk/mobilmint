import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import { errorMessage } from '@/lib/utils'
import { assertAdmin } from '@/lib/dev-role'

export type AksiHasil<T = undefined> =
  | { ok: true; data?: T; pesan?: string }
  | { ok: false; error: string }

/**
 * Bungkus semua server action: cek hak akses admin, jalankan,
 * dan ubah error apapun jadi pesan yang aman ditampilkan ke user.
 */
export async function jalankan<T>(
  fn: (db: ReturnType<typeof createServerClient>) => Promise<T>,
  opts?: { pesan?: string; skipAuth?: boolean },
): Promise<AksiHasil<T>> {
  try {
    if (!opts?.skipAuth) await assertAdmin()
    const db = createServerClient()
    const data = await fn(db)
    return { ok: true, data, pesan: opts?.pesan }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export function cek<T = any>(res: { data: any; error: { message: string } | null }): T {
  if (res.error) throw new Error(terjemahkanError(res.error.message))
  return res.data as T
}

/** Ubah pesan error Postgres yang umum jadi bahasa Indonesia. */
export function terjemahkanError(msg: string): string {
  if (/duplicate key/i.test(msg)) {
    if (/nama_golongan/i.test(msg)) return 'Nama golongan itu sudah dipakai.'
    if (/email/i.test(msg)) return 'Email itu sudah terdaftar.'
    if (/car_id/i.test(msg)) return 'Unit ini sudah punya transaksi tersebut.'
    return 'Data dengan nilai unik yang sama sudah ada.'
  }
  if (/violates foreign key/i.test(msg)) {
    return 'Data ini masih dipakai di transaksi lain, jadi tidak bisa dihapus.'
  }
  if (/nisbah_total_100/i.test(msg)) {
    return 'Nisbah investor + pengelola harus tepat 100%.'
  }
  if (/permission denied|row-level security/i.test(msg)) {
    return 'Anda tidak punya akses untuk aksi ini.'
  }
  return msg
}
