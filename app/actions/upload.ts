'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdmin } from '@/lib/dev-role'
import { errorMessage } from '@/lib/utils'

const BUCKET = 'documents'

/**
 * Upload dokumen (bukti transfer, dokumen akad, dll) ke bucket privat
 * `documents`. Dijalankan di server pakai service role supaya tidak perlu
 * Storage RLS policy dulu (baru dipasang di Fase 5) — client browser tidak
 * pernah menyentuh bucket privat secara langsung.
 */
export async function uploadDokumen(formData: FormData) {
  try {
    await assertAdmin()

    const file = formData.get('file')
    if (!(file instanceof File)) {
      return { ok: false as const, error: 'File tidak ditemukan' }
    }
    if (file.size > 10 * 1024 * 1024) {
      return { ok: false as const, error: 'Ukuran file maksimal 10MB' }
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const path = `${crypto.randomUUID()}.${ext}`

    const db = createAdminClient()
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error } = await db.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type || undefined, upsert: false })

    if (error) throw new Error(error.message)

    return { ok: true as const, data: { path } }
  } catch (e) {
    return { ok: false as const, error: errorMessage(e, 'Gagal mengunggah file') }
  }
}

/** Ambil signed URL sementara untuk menampilkan dokumen privat. */
export async function getSignedUrlDokumen(path: string) {
  try {
    const db = createAdminClient()
    const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 60 * 10)
    if (error) throw new Error(error.message)
    return { ok: true as const, data: { url: data.signedUrl } }
  } catch (e) {
    return { ok: false as const, error: errorMessage(e, 'Gagal membuka dokumen') }
  }
}
