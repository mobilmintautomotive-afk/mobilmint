import 'server-only'
import { cookies } from 'next/headers'
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

export const VIEW_AS_ROLE_COOKIE = 'mm_view_as_role'
export const VIEW_AS_INVESTOR_COOKIE = 'mm_view_as_investor_id'

/**
 * Identitas ASLI yang login (Supabase Auth + profil di tabel `profiles`).
 * TIDAK PERNAH terpengaruh fitur "Lihat sebagai" — dipakai untuk identitas
 * di account menu dan untuk otorisasi server action (assertAdmin).
 * Kembalikan null kalau belum login, akunnya dinonaktifkan, atau belum
 * terdaftar di `profiles` — caller WAJIB memperlakukan null sebagai
 * "tidak boleh akses apa-apa", jangan pernah default ke role tertentu.
 */
export async function getRealUser(): Promise<CurrentUser | null> {
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

/**
 * Identitas EFEKTIF — dipakai untuk semua pengecekan role & tampilan
 * halaman. Kalau user asli admin dan sedang mengaktifkan "Lihat sebagai"
 * (cookie), role & investor_id di sini ikut berubah supaya halaman yang
 * dirender persis seperti yang dilihat role tersebut. Non-admin tidak
 * pernah terpengaruh cookie ini walau isinya dimanipulasi manual.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const real = await getRealUser()
  if (!real || real.role !== 'admin') return real

  const store = cookies()
  const viewAsRole = store.get(VIEW_AS_ROLE_COOKIE)?.value

  if (viewAsRole === 'holding') {
    return { ...real, role: 'holding', investor_id: null }
  }
  if (viewAsRole === 'investor') {
    const investorId = store.get(VIEW_AS_INVESTOR_COOKIE)?.value
    if (investorId) return { ...real, role: 'investor', investor_id: investorId }
  }
  return real
}

/** Role efektif saat ini, atau null kalau belum login / tidak berhak akses. */
export async function getCurrentRole(): Promise<UserRole | null> {
  return (await getCurrentUser())?.role ?? null
}

export async function getCurrentInvestorId(): Promise<string | null> {
  return (await getCurrentUser())?.investor_id ?? null
}

/** Boleh menulis data? (admin saja, mengikuti role efektif) */
export async function canWrite(): Promise<boolean> {
  return (await getCurrentRole()) === 'admin'
}

/** Boleh membuka area pengelola? (admin & holding, mengikuti role efektif) */
export async function canViewBackoffice(): Promise<boolean> {
  const role = await getCurrentRole()
  return role === 'admin' || role === 'holding'
}

/**
 * Otorisasi server action — SELALU cek identitas ASLI, bukan efektif.
 * Admin yang sedang "Lihat sebagai" tetap punya hak admin sungguhan
 * (view-as cuma preview tampilan, bukan pembatasan akun sendiri).
 */
export async function assertAdmin() {
  const real = await getRealUser()
  if (real?.role !== 'admin') {
    throw new Error('Anda tidak punya akses untuk melakukan aksi ini.')
  }
}
