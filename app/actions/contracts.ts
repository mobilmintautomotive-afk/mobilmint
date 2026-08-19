'use server'

import { revalidatePath } from 'next/cache'
import { jalankan, cek } from './_helper'
import { akadSchema, konfirmasiDanaSchema } from '@/lib/validations'

const PATHS = ['/transaksi/akad', '/master/investor', '/dashboard', '/investor']

/**
 * Buat akad baru. Nilai investasi & nisbah adalah kesepakatan langsung
 * dengan investor ini (bukan turunan dari golongan/tier bersama) —
 * `tanggal_akad` berfungsi sebagai tanggal berlaku kesepakatan itu. Kalau
 * kesepakatan berubah (mis. investor menambah investasi dengan nisbah
 * baru), cukup buat akad baru; akad lama tidak ikut berubah.
 * Saldo BELUM bertambah sampai dana dikonfirmasi.
 */
export async function buatAkad(input: unknown) {
  const parsed = akadSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const v = parsed.data

  const res = await jalankan(async (db) => {
    const no = cek(await db.rpc('fn_next_doc_number', { p_prefix: 'AKD', p_date: v.tanggal_akad }))

    const row = cek(
      await db
        .from('investor_contracts')
        .insert({
          no_akad: no,
          investor_id: v.investor_id,
          nilai_investasi: v.nilai_investasi,
          nisbah_investor_pct: v.nisbah_investor_pct,
          nisbah_pengelola_pct: v.nisbah_pengelola_pct,
          tenor_bulan: v.tenor_bulan,
          tanggal_akad: v.tanggal_akad,
          dokumen_url: v.dokumen_url,
          catatan: v.catatan,
          status: 'MENUNGGU_DANA',
        })
        .select('id, no_akad')
        .single(),
    ) as { id: string; no_akad: string }

    return row
  })

  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}

/**
 * Konfirmasi dana investor sudah masuk rekening.
 * Membuat SATU entri ledger SETORAN → saldo investor naik.
 *
 * Catatan untuk pengembangan lanjutan: kalau nanti pakai payment gateway,
 * webhook cukup memanggil fungsi ini — tidak perlu jalur baru.
 */
export async function konfirmasiDanaDiterima(input: unknown) {
  const parsed = konfirmasiDanaSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const v = parsed.data

  const res = await jalankan(async (db) => {
    const akad = cek(
      await db.from('investor_contracts').select('*').eq('id', v.contract_id).single(),
    ) as any

    if (akad.status !== 'MENUNGGU_DANA') {
      throw new Error('Akad ini sudah dikonfirmasi sebelumnya.')
    }

    cek(
      await db
        .from('investor_contracts')
        .update({
          status: 'AKTIF',
          tanggal_dana_diterima: v.tanggal_dana_diterima,
          jumlah_diterima: v.jumlah_diterima,
          bukti_transfer_url: v.bukti_transfer_url,
        })
        .eq('id', v.contract_id)
        .select('id'),
    )

    cek(
      await db
        .from('investor_ledger')
        .insert({
          investor_id: akad.investor_id,
          contract_id: v.contract_id,
          tipe: 'SETORAN',
          amount: v.jumlah_diterima,
          keterangan: `Setoran investasi — nisbah ${akad.nisbah_investor_pct}%`,
          ref_table: 'investor_contracts',
          ref_id: v.contract_id,
          tanggal: v.tanggal_dana_diterima,
        })
        .select('id'),
    )

    return undefined
  })

  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}

/** Batalkan akad yang belum dikonfirmasi (saldo belum terpengaruh). */
export async function batalkanAkad(id: string) {
  const res = await jalankan(async (db) => {
    const akad = cek(
      await db.from('investor_contracts').select('status').eq('id', id).single(),
    ) as any
    if (akad.status !== 'MENUNGGU_DANA') {
      throw new Error(
        'Hanya akad berstatus Menunggu Dana yang bisa dibatalkan. Akad yang sudah aktif punya jejak saldo.',
      )
    }
    cek(await db.from('investor_contracts').update({ status: 'BATAL' }).eq('id', id).select('id'))
    return undefined
  })
  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}
