import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client. HANYA boleh dipanggil dari server.
 * Jangan pernah mengekspos key ini ke bundle client
 * (jangan diberi prefix NEXT_PUBLIC_).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local (server only, tanpa prefix NEXT_PUBLIC).',
    )
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
