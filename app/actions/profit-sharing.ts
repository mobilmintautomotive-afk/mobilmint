'use server'

import { revalidatePath } from 'next/cache'
import { jalankan, cek } from './_helper'
import { bagiHasilSchema } from '@/lib/validations'

const PATHS = [
  '/transaksi/bagi-hasil',
  '/transaksi/penjualan',
  '/master/investor',
  '/master/mobil',
  '/dashboard',
  '/investor',
  '/laporan/laba-rugi',
]

/**
 * Proses bagi hasil satu unit.
 *
 * Seluruh langkah (insert profit_sharings + details, 2 entri ledger per
 * investor, update status unit) dijalankan oleh function
 * `process_profit_sharing` supaya atomik — kalau ada yang gagal,
 * tidak ada entri ledger setengah jadi.
 */
export async function prosesBagiHasil(input: unknown) {
  const parsed = bagiHasilSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const v = parsed.data

  const res = await jalankan(async (db) => {
    const id = cek(
      await db.rpc('process_profit_sharing', {
        p_car_sale_id: v.car_sale_id,
        p_tanggal: v.tanggal_proses,
      }),
    )
    return { id: id as unknown as string }
  })

  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}

/**
 * Batalkan bagi hasil. Data lama TIDAK dihapus — sistem membuat
 * entri ledger pembalik supaya jejak audit tetap utuh.
 */
export async function batalkanBagiHasil(profitSharingId: string, tanggal: string) {
  const res = await jalankan(async (db) => {
    cek(
      await db.rpc('reverse_profit_sharing', {
        p_profit_sharing_id: profitSharingId,
        p_tanggal: tanggal,
      }),
    )
    return undefined
  })
  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}

/** Tandai bagian bagi hasil seorang investor sudah ditransfer. */
export async function tandaiSudahTransfer(detailId: string, sudah: boolean) {
  const res = await jalankan(async (db) => {
    cek(
      await db
        .from('profit_sharing_details')
        .update({ sudah_ditransfer: sudah })
        .eq('id', detailId)
        .select('id'),
    )
    return undefined
  })
  if (res.ok) revalidatePath('/transaksi/bagi-hasil')
  return res
}
