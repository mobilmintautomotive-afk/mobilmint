'use server'

import { revalidatePath } from 'next/cache'
import { jalankan, cek } from './_helper'
import { penjualanSchema } from '@/lib/validations'
import { hitungPenjualan, totalRincian } from '@/lib/calc'

const PATHS = [
  '/transaksi/penjualan',
  '/transaksi/stock',
  '/transaksi/pencairan',
  '/master/mobil',
  '/master/investor',
  '/dashboard',
  '/investor',
  '/laporan/laba-rugi',
  '/laporan/neraca',
]

/**
 * Simpan penjualan unit SEKALIGUS proses bagi hasil — begitu penjualan
 * disimpan, modal investor langsung kembali + bagi hasil langsung masuk
 * ke saldo mereka (unit langsung berstatus SELESAI). Tidak ada lagi
 * langkah "Proses Bagi Hasil" manual terpisah.
 *
 * HPP dikunci (snapshot) saat transaksi disimpan supaya perbaikan yang
 * diinput belakangan tidak mengubah laba yang sudah tercatat.
 *
 * Kalau proses bagi hasil gagal, transaksi penjualan ikut dibatalkan
 * (rollback manual) supaya tidak ada data setengah jadi.
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
    // process_profit_sharing di bawah.
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

    try {
      cek(await db.rpc('process_profit_sharing', { p_car_sale_id: row.id, p_tanggal: v.tanggal_jual }))
    } catch (e) {
      // rollback manual: penjualan gagal dibagi hasil, jangan tinggalkan data setengah jadi
      await db.from('car_sales').delete().eq('id', row.id)
      await db.from('cars').update({ status: 'READY_STOCK' }).eq('id', v.car_id)
      throw e
    }

    return row
  })

  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}

/**
 * Batalkan penjualan. Karena bagi hasil sekarang otomatis diproses saat
 * penjualan disimpan, pembatalan ikut membalikkan bagi hasilnya (entri
 * ledger pembalik, data lama tidak dihapus — lihat reverse_profit_sharing).
 *
 * Kalau dana bagi hasil untuk unit ini SUDAH ada yang dicairkan ke
 * investor (lihat menu Pencairan Dana), pembatalan diblokir — uang itu
 * sudah benar-benar keluar dan butuh rekonsiliasi manual, sistem tidak
 * boleh pura-pura membatalkannya begitu saja.
 */
export async function batalkanPenjualan(id: string) {
  const res = await jalankan(async (db) => {
    const sale = cek(
      await db.from('car_sales').select('car_id, is_profit_shared').eq('id', id).single(),
    ) as any

    if (sale.is_profit_shared) {
      const ps = cek(
        await db.from('profit_sharings').select('id').eq('car_sale_id', id).maybeSingle(),
      ) as any

      if (ps) {
        const sudahCair = cek(
          await db
            .from('profit_sharing_details')
            .select('id')
            .eq('profit_sharing_id', ps.id)
            .eq('sudah_ditransfer', true)
            .limit(1),
        ) as any[]

        if (sudahCair.length > 0) {
          throw new Error(
            'Sebagian dana bagi hasil unit ini sudah dicairkan ke investor. Tidak bisa dibatalkan otomatis — perlu rekonsiliasi manual.',
          )
        }

        cek(
          await db.rpc('reverse_profit_sharing', {
            p_profit_sharing_id: ps.id,
            p_tanggal: new Date().toISOString().slice(0, 10),
          }),
        )
      }
    }

    cek(await db.from('car_sales').delete().eq('id', id).select('id'))
    cek(await db.from('cars').update({ status: 'READY_STOCK' }).eq('id', sale.car_id).select('id'))
    return undefined
  })
  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}
