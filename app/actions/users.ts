'use server'

import { revalidatePath } from 'next/cache'
import { jalankan, cek, type AksiHasil } from './_helper'
import { createAdminClient } from '@/lib/supabase/admin'
import { penggunaSchema } from '@/lib/validations'

/** Password sementara 10 karakter, hindari 0/O/1/l/I yang gampang ketuker. */
function buatPasswordSementara() {
  const abjad = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 10; i++) out += abjad[Math.floor(Math.random() * abjad.length)]
  return out
}

function pesanAuthError(msg: string | undefined) {
  if (!msg) return 'Gagal membuat akun login.'
  if (/already been registered|already exists|duplicate/i.test(msg)) {
    return 'Email ini sudah terdaftar sebagai akun login.'
  }
  return msg
}

/** Daftarkan pengguna baru: buat akun Supabase Auth + baris profiles-nya sekaligus. */
export async function daftarkanPengguna(
  input: unknown,
): Promise<AksiHasil<{ id: string; passwordSementara: string }>> {
  const parsed = penggunaSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const v = parsed.data

  const res = await jalankan(async (db) => {
    const admin = createAdminClient()
    const passwordSementara = buatPasswordSementara()

    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: v.email,
      password: passwordSementara,
      email_confirm: true,
    })
    if (authErr || !authUser.user) {
      throw new Error(pesanAuthError(authErr?.message))
    }

    try {
      const row = cek(
        await db
          .from('profiles')
          .insert({
            auth_user_id: authUser.user.id,
            nama: v.nama,
            email: v.email,
            role: v.role,
            investor_id: v.role === 'investor' ? v.investor_id : null,
            is_active: v.is_active,
            must_change_password: true,
          })
          .select('id')
          .single(),
      )
      return { id: (row as { id: string }).id, passwordSementara }
    } catch (e) {
      // Rollback akun auth kalau gagal simpan profil, supaya ga ada akun nyangkut tanpa profil.
      await admin.auth.admin.deleteUser(authUser.user.id)
      throw e
    }
  })

  if (res.ok) revalidatePath('/admin/users')
  return res
}

/** Edit pengguna yang sudah ada. Kalau email berubah, akun login-nya ikut diupdate. */
export async function perbaruiPengguna(input: unknown): Promise<AksiHasil<{ id: string }>> {
  const parsed = penggunaSchema.safeParse(input)
  if (!parsed.success || !parsed.data.id) {
    return { ok: false, error: parsed.error?.issues[0]?.message ?? 'Data tidak valid' }
  }
  const v = parsed.data as typeof parsed.data & { id: string }

  const res = await jalankan(async (db) => {
    const existing = cek<{ auth_user_id: string | null; email: string }>(
      await db.from('profiles').select('auth_user_id, email').eq('id', v.id).single(),
    )

    if (existing.auth_user_id && existing.email !== v.email) {
      const admin = createAdminClient()
      const { error } = await admin.auth.admin.updateUserById(existing.auth_user_id, {
        email: v.email,
      })
      if (error) throw new Error('Gagal mengubah email login: ' + pesanAuthError(error.message))
    }

    const row = cek(
      await db
        .from('profiles')
        .update({
          nama: v.nama,
          email: v.email,
          role: v.role,
          investor_id: v.role === 'investor' ? v.investor_id : null,
          is_active: v.is_active,
        })
        .eq('id', v.id)
        .select('id')
        .single(),
    )
    return row as { id: string }
  })

  if (res.ok) revalidatePath('/admin/users')
  return res
}

/** Set password baru acak untuk pengguna, wajib diganti sendiri saat login berikutnya. */
export async function resetPasswordPengguna(
  id: string,
): Promise<AksiHasil<{ passwordSementara: string }>> {
  const res = await jalankan(async (db) => {
    const profil = cek<{ auth_user_id: string | null }>(
      await db.from('profiles').select('auth_user_id').eq('id', id).single(),
    )
    if (!profil.auth_user_id) {
      throw new Error('Akun ini belum punya login Supabase Auth.')
    }

    const passwordSementara = buatPasswordSementara()
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.updateUserById(profil.auth_user_id, {
      password: passwordSementara,
    })
    if (error) throw new Error('Gagal reset password: ' + pesanAuthError(error.message))

    cek(await db.from('profiles').update({ must_change_password: true }).eq('id', id).select('id'))
    return { passwordSementara }
  })

  if (res.ok) revalidatePath('/admin/users')
  return res
}

/** Aktifkan/nonaktifkan pengguna — akun login-nya ikut di-ban supaya beneran ga bisa masuk. */
export async function ubahStatusPengguna(id: string, aktif: boolean): Promise<AksiHasil> {
  const res = await jalankan(async (db) => {
    const profil = cek<{ auth_user_id: string | null }>(
      await db.from('profiles').select('auth_user_id').eq('id', id).single(),
    )

    if (profil.auth_user_id) {
      const admin = createAdminClient()
      await admin.auth.admin.updateUserById(profil.auth_user_id, {
        ban_duration: aktif ? 'none' : '876000h', // ~100 tahun == nonaktif permanen sampai diaktifkan lagi
      })
    }

    cek(await db.from('profiles').update({ is_active: aktif }).eq('id', id).select('id'))
    return undefined
  })
  if (res.ok) revalidatePath('/admin/users')
  return res
}
