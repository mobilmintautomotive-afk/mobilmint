'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'

const PESAN_ERROR: Record<string, string> = {
  'Invalid login credentials': 'Email atau password salah.',
  'Email not confirmed': 'Email belum dikonfirmasi.',
  'Too many requests': 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.',
}

export async function login(email: string, password: string) {
  if (!email || !password) {
    return { ok: false as const, error: 'Email dan password wajib diisi.' }
  }

  const supabase = createServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return { ok: false as const, error: PESAN_ERROR[error?.message ?? ''] ?? 'Gagal masuk. Coba lagi.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active, must_change_password')
    .eq('auth_user_id', data.user.id)
    .maybeSingle()

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut()
    return {
      ok: false as const,
      error: 'Akun ini belum terdaftar atau sudah dinonaktifkan. Hubungi admin.',
    }
  }

  revalidatePath('/', 'layout')

  if (profile.must_change_password) redirect('/ganti-password')
  redirect(profile.role === 'investor' ? '/investor' : '/dashboard')
}

export async function logout() {
  const supabase = createServerClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function gantiPasswordSendiri(passwordBaru: string) {
  if (!passwordBaru || passwordBaru.length < 8) {
    return { ok: false as const, error: 'Password baru minimal 8 karakter.' }
  }

  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Sesi login sudah berakhir. Masuk lagi.' }

  const { error } = await supabase.auth.updateUser({ password: passwordBaru })
  if (error) return { ok: false as const, error: 'Gagal mengubah password. Coba lagi.' }

  await supabase.from('profiles').update({ must_change_password: false }).eq('auth_user_id', user.id)

  revalidatePath('/', 'layout')
  return { ok: true as const }
}
