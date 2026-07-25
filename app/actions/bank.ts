'use server'

import { revalidatePath } from 'next/cache'
import { jalankan, cek } from './_helper'
import { bankSchema, mutasiKasSchema, priveSchema } from '@/lib/validations'

const PATHS = ['/master/bank', '/transaksi/kas', '/laporan/neraca', '/dashboard']

/* ------------------------------ Akun bank ----------------------------- */

export async function simpanAkunBank(input: unknown) {
  const parsed = bankSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const { id, ...values } = parsed.data

  const res = await jalankan(async (db) => {
    // Indeks unik parsial hanya mengizinkan satu rekening default, jadi
    // yang lama harus dilepas dulu sebelum yang baru disimpan.
    if (values.is_default) {
      let q = db.from('bank_accounts').update({ is_default: false }).eq('is_default', true)
      if (id) q = q.neq('id', id)
      cek(await q.select('id'))
    }

    if (id) {
      return cek(
        await db.from('bank_accounts').update(values).eq('id', id).select('id').single(),
      ) as { id: string }
    }
    return cek(
      await db.from('bank_accounts').insert(values).select('id').single(),
    ) as { id: string }
  })

  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}

export async function hapusAkunBank(id: string) {
  const res = await jalankan(async (db) => {
    const mutasi = cek(
      await db.from('cash_ledger').select('id').eq('bank_account_id', id).limit(1),
    ) as any[]
    if (mutasi.length > 0) {
      throw new Error(
        'Rekening ini sudah punya mutasi kas, jadi tidak bisa dihapus. Nonaktifkan saja lewat tombol Edit supaya riwayatnya tetap utuh.',
      )
    }
    cek(await db.from('bank_accounts').delete().eq('id', id).select('id'))
    return undefined
  })
  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}

/* ----------------------------- Mutasi kas ----------------------------- */

/**
 * Nominal diinput selalu positif; arah masuk/keluar ditentukan dari jenis
 * mutasinya supaya user tidak perlu memikirkan tanda minus.
 */
const KELUAR = new Set(['PRIVE_PENGELOLA', 'TRANSFER_KELUAR'])

export async function catatMutasiKas(input: unknown) {
  const parsed = mutasiKasSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const v = parsed.data
  const amount = KELUAR.has(v.tipe) ? -v.nominal : v.nominal

  const res = await jalankan(async (db) => {
    cek(
      await db.rpc('catat_mutasi_kas', {
        p_bank_account_id: v.bank_account_id,
        p_tanggal: v.tanggal,
        p_tipe: v.tipe,
        p_amount: amount,
        p_keterangan: v.keterangan,
      }),
    )
    return undefined
  })

  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}

export async function hapusMutasiKas(id: string) {
  const res = await jalankan(async (db) => {
    const row = cek(
      await db.from('cash_ledger').select('is_auto').eq('id', id).single(),
    ) as any
    if (row.is_auto) {
      throw new Error(
        'Mutasi ini dibuat otomatis dari transaksinya. Untuk mengubahnya, edit atau batalkan transaksi aslinya.',
      )
    }
    cek(await db.from('cash_ledger').delete().eq('id', id).select('id'))
    return undefined
  })
  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}

/** Cairkan hak pengelola ke rekening pribadi (prive). */
export async function cairkanHakPengelola(input: unknown) {
  const parsed = priveSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const v = parsed.data

  const res = await jalankan(async (db) => {
    cek(
      await db.rpc('cairkan_hak_pengelola', {
        p_bank_account_id: v.bank_account_id,
        p_amount: v.nominal,
        p_tanggal: v.tanggal,
        p_keterangan: v.keterangan,
      }),
    )
    return undefined
  })

  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}

/**
 * Susulkan pencatatan kas untuk transaksi yang sudah terlanjur ada —
 * dipakai saat rekening baru dibuat setelah aplikasi berjalan.
 */
export async function backfillKas() {
  const res = await jalankan(async (db) => {
    cek(await db.rpc('fn_backfill_cash'))
    return undefined
  })
  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}
