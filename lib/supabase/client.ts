'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Client browser — dipakai untuk upload Storage dan data yang perlu realtime.
 * Semua MUTASI data tetap lewat Server Action (PRD 03 bagian 1).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Supabase belum dikonfigurasi. Cek .env.local')
  }
  return createBrowserClient(url, anonKey)
}
