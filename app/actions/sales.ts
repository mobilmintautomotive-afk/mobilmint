'use server'

import { revalidatePath } from 'next/cache'
import { jalankan, cek } from './_helper'
import { penjualanSchema } from '@/lib/validations'
import { hitungPenjualan, totalRincian } from '@/lib/calc'

const PATHS = [
  '/transaksi/penjualan',
  '/transaksi/stock',
  '/transaksi/bagi-hasil',
  '/master/mobil',
  '/dashboard',
  '/laporan/laba-rugi',
]

/**
 * Simpan penjualan unit.
 * HPP dikunci (snapshot) saat transaksi disimpan supaya perbaikan
 * yang diinput belakangan tidak mengubah laba yang sudah tercatat.
 *
 * Saldo investor BELUM berubah di sini — perubahan saldo baru terjadi
 * saat bagi hasil diproses.
 */
export async function buatPenjualan(input: unknown) {
  const parsed = penjualanSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const v = parsed.data
  const biayaLain = totalRincian(v.rincian_biaya_lain)

  const res = await jalankan(async (db) => {
    const car = cek(await db.from('cars').select('status').eq('id', v.car_id).single()) as any
    if (car.status !== 'READY_STOCK') {
      throw new Error('Hanya unit berstatus Ready Stock yang bisa dijual.')
    }

    const hppRow = cek(
      await db.from('v_car_hpp').select('hpp').eq('car_id', v.car_id).single(),
    ) as any
    const hpp = Number(hppRow.hpp)

    // nisbah tertimbang hanya dipakai untuk info; angka final dihitung di
    // process_profit_sharing saat bagi hasil diproses.
    const hasil = hitungPenjualan({
      hargaJual: v.harga_jual,
      hpp,
      komisiSales: v.komisi_sales,
      biayaLain,
      nisbahInvestorPct: 0,
    })

    const no = cek(await db.rpc('fn_next_doc_number', { p_prefix: 'JUL', p_date: v.tanggal_jual }))

    const row = cek(
      await db
        .from('car_sales')
        .insert({
          no_transaksi: no,
          car_id: v.car_id,
          customer_id: v.customer_id || null,
          sales_person_id: v.sales_person_id || null,
          tanggal_jual: v.tanggal_jual,
          harga_jual: v.harga_jual,
          komisi_sales: v.komisi_sales,
          biaya_lain: biayaLain,
          rincian_biaya_lain: v.rincian_biaya_lain,
          hpp_snapshot: hpp,
          laba_kotor: hasil.labaKotor,
          laba_bersih: hasil.labaBersih,
          metode_bayar: v.metode_bayar,
          catatan: v.catatan,
        })
        .select('id')
        .single(),
    ) as { id: string }

    cek(await db.from('cars').update({ status: 'TERJUAL' }).eq('id', v.car_id).select('id'))

    return row
  })

  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}

/** Batalkan penjualan yang belum dibagi hasil — unit kembali ke Ready Stock. */
export async function batalkanPenjualan(id: string) {
  const res = await jalankan(async (db) => {
    const sale = cek(
      await db.from('car_sales').select('car_id, is_profit_shared').eq('id', id).single(),
    ) as any
    if (sale.is_profit_shared) {
      throw new Error(
        'Bagi hasil untuk unit ini sudah diproses. Batalkan bagi hasilnya dulu di menu Bagi Hasil.',
      )
    }
    cek(await db.from('car_sales').delete().eq('id', id).select('id'))
    cek(await db.from('cars').update({ status: 'READY_STOCK' }).eq('id', sale.car_id).select('id'))
    return undefined
  })
  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}
