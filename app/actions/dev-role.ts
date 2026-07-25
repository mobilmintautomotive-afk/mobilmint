'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { DEV_ROLE_COOKIE, DEV_INVESTOR_COOKIE } from '@/lib/dev-role'
import type { UserRole } from '@/lib/constants'

/**
 * Hanya dipakai selama Fase 1–4 (role switcher dummy).
 * Hapus file ini bersama <RoleSwitcher /> saat Fase 5 selesai.
 */
export async function setDevRole(role: UserRole, investorId?: string | null) {
  const store = cookies()
  const opts = { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: false as const }

  store.set(DEV_ROLE_COOKIE, role, opts)
  if (role === 'investor' && investorId) {
    store.set(DEV_INVESTOR_COOKIE, investorId, opts)
  } else if (role !== 'investor') {
    store.set(DEV_INVESTOR_COOKIE, '', { ...opts, maxAge: 0 })
  }

  revalidatePath('/', 'layout')
}
