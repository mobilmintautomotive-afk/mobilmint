import 'server-only'
import type { UserRole } from '@/lib/constants'
import { createServerClient } from '@/lib/supabase/server'

export type CurrentUser = {
  id: string
  auth_user_id: string
  nama: string
  email: string
  role: UserRole
  investor_id: string | null
  is_active: boolean
  must_change_password: boolean
}

/**
 * Ambil user yang sedang login (Supabase Auth) + profil-nya di tabel
 * `profiles`. Kembalikan null kalau belum login, akunnya dinonaktifkan,
 * atau belum terdaftar di `profiles` sama sekali — caller WAJIB
 * memperlakukan null sebagai "tidak boleh akses apa-apa", jangan
 * pernah default ke role tertentu.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nama, email, role, investor_id, is_active, must_change_password')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!profile || !profile.is_active) return null

  return {
    id: profile.id,
    auth_user_id: user.id,
    nama: profile.nama,
    email: profile.email,
    role: profile.role as UserRole,
    investor_id: profile.investor_id,
    is_active: profile.is_active,
    must_change_password: profile.must_change_password,
  }
}

/** Role user saat ini, atau null kalau belum login / tidak berhak akses. */
export async function getCurrentRole(): Promise<UserRole | null> {
  return (await getCurrentUser())?.role ?? null
}

export async function getCurrentInvestorId(): Promise<string | null> {
  return (await getCurrentUser())?.investor_id ?? null
}

/** Boleh menulis data? (admin saja) */
export async function canWrite(): Promise<boolean> {
  return (await getCurrentRole()) === 'admin'
}

/** Boleh membuka area pengelola? (admin & holding) */
export async function canViewBackoffice(): Promise<boolean> {
  const role = await getCurrentRole()
  return role === 'admin' || role === 'holding'
}

/** Lempar error kalau role bukan admin — dipakai di awal server action. */
export async function assertAdmin() {
  const role = await getCurrentRole()
  if (role !== 'admin') {
    throw new Error('Anda tidak punya akses untuk melakukan aksi ini.')
  }
}
