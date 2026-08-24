'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getRealUser, VIEW_AS_INVESTOR_COOKIE, VIEW_AS_ROLE_COOKIE } from '@/lib/dev-role'

const OPTS = { path: '/', maxAge: 60 * 60 * 8, httpOnly: false as const }

/** Aktifkan "Lihat sebagai" — cuma bisa dipanggil oleh admin sungguhan. */
export async function setViewAs(role: 'holding' | 'investor', investorId?: string) {
  const real = await getRealUser()
  if (real?.role !== 'admin') {
    throw new Error('Anda tidak punya akses untuk fitur ini.')
  }
  if (role === 'investor' && !investorId) {
    throw new Error('Pilih investor yang mau dilihat.')
  }

  const store = cookies()
  store.set(VIEW_AS_ROLE_COOKIE, role, OPTS)
  if (role === 'investor' && investorId) {
    store.set(VIEW_AS_INVESTOR_COOKIE, investorId, OPTS)
  } else {
    store.set(VIEW_AS_INVESTOR_COOKIE, '', { ...OPTS, maxAge: 0 })
  }

  revalidatePath('/', 'layout')
}

/** Kembali ke tampilan admin asli. */
export async function clearViewAs() {
  const store = cookies()
  store.set(VIEW_AS_ROLE_COOKIE, '', { ...OPTS, maxAge: 0 })
  store.set(VIEW_AS_INVESTOR_COOKIE, '', { ...OPTS, maxAge: 0 })
  revalidatePath('/', 'layout')
}
