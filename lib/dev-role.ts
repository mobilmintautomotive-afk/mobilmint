import 'server-only'
import { cookies } from 'next/headers'
import type { UserRole } from '@/lib/constants'

/**
 * ==============================================================
 * MODE DEVELOPMENT FASE 1–4 — BELUM ADA AUTH
 * ==============================================================
 * Role dibaca dari cookie yang di-set oleh komponen <RoleSwitcher />
 * di navbar. SEMUA pengecekan akses di aplikasi memanggil fungsi di
 * file ini, bukan Supabase Auth langsung.
 *
 * DI FASE 5: cukup ganti isi `getCurrentUser()` jadi baca session
 * Supabase Auth (lihat PRD 05 bagian 1.3). Sisa aplikasi tidak
 * perlu diubah sama sekali, lalu hapus <RoleSwitcher /> dari navbar.
 */

export const DEV_ROLE_COOKIE = 'mm_dev_role'
export const DEV_INVESTOR_COOKIE = 'mm_dev_investor_id'

export type CurrentUser = {
  id: string | null
  nama: string
  role: UserRole
  investor_id: string | null
  is_active: boolean
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = cookies()
  const role = (store.get(DEV_ROLE_COOKIE)?.value ?? 'admin') as UserRole
  const investorId = store.get(DEV_INVESTOR_COOKIE)?.value ?? null

  const nama =
    role === 'admin' ? 'Admin (dev)' : role === 'holding' ? 'Holding (dev)' : 'Investor (dev)'

  return {
    id: null,
    nama,
    role,
    investor_id: role === 'investor' ? investorId : null,
    is_active: true,
  }
}

export async function getCurrentRole(): Promise<UserRole> {
  return (await getCurrentUser())?.role ?? 'admin'
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
