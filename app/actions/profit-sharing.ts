'use server'

import { revalidatePath } from 'next/cache'
import { jalankan, cek } from './_helper'

const PATHS = [
  '/transaksi/pencairan',
  '/master/investor',
  '/dashboard',
  '/investor',
  '/laporan/laba-rugi',
  '/laporan/neraca',
]

/**
 * Cairkan dana bagi hasil satu investor untuk satu unit — dipanggil dari
 * menu Pencairan Dana. Membuat entri ledger PENARIKAN sejumlah bagi_hasil
 * (bukan modal_kembali, modal pokok tetap di saldo) dan menandai baris ini
 * sudah ditransfer, lengkap bukti transfer (opsional).
 *
 * Proses bagi hasil itu sendiri sekarang OTOMATIS terjadi saat penjualan
 * disimpan (lihat app/actions/sales.ts) — file ini murni soal pencairan
 * (transfer riil ke rekening investor), bukan perhitungan bagi hasilnya.
 */
export async function prosesPencairan(input: {
  detail_id: string
  tanggal: string
  bukti_transfer_url?: string | null
}) {
  const res = await jalankan(async (db) => {
    cek(
      await db.rpc('proses_pencairan_dana', {
        p_detail_id: input.detail_id,
        p_tanggal: input.tanggal,
        p_bukti_url: input.bukti_transfer_url || null,
      }),
    )
    return undefined
  })
  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}
