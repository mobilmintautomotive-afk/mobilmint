import 'server-only'
import { createServerClient as createSSRClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return { url, anonKey, configured: Boolean(url && anonKey) }
}

/**
 * Client untuk Server Component & Server Action.
 * Fase 1–4 belum ada auth, tapi bentuknya sudah cookie-aware supaya
 * Fase 5 tinggal dipakai apa adanya.
 */
export function createServerClient() {
  const { url, anonKey, configured } = supabaseEnv()
  if (!configured) {
    throw new Error(
      'Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local',
    )
  }

  const cookieStore = cookies()

  return createSSRClient(url!, anonKey!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // dipanggil dari Server Component — diabaikan, middleware yang refresh
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch {
          // idem
        }
      },
    },
  })
}
