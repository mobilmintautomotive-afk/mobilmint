'use server'

import { revalidatePath } from 'next/cache'
import { jalankan, cek } from './_helper'
import { bookingSchema, lunasiBookingSchema } from '@/lib/validations'
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
 * Catat booking baru: customer bayar DP, unit ditahan (status jadi
 * TERBOOKING) supaya tidak ditawarkan ke pembeli lain sampai lunas atau
 * dibatalkan. Belum menyentuh HPP/bagi hasil — itu baru terjadi saat
 * `lunasiBooking` dipanggil.
 */
export async function buatBooking(input: unknown) {
  const parsed = bookingSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const v = parsed.data

  const res = await jalankan(async (db) => {
    const car = cek(await db.from('cars').select('status').eq('id', v.car_id).single()) as any
    if (car.status !== 'READY_STOCK') {
      throw new Error('Hanya unit berstatus Ready Stock yang bisa dibooking.')
    }

    const no = cek(await db.rpc('fn_next_doc_number', { p_prefix: 'BOK', p_date: v.tanggal_booking }))

    const row = cek(
      await db
        .from('bookings')
        .insert({
          no_booking: no,
          car_id: v.car_id,
          customer_id: v.customer_id || null,
          sales_person_id: v.sales_person_id || null,
          tanggal_booking: v.tanggal_booking,
          harga_sepakat: v.harga_sepakat,
          dp_amount: v.dp_amount,
          metode_bayar: v.metode_bayar,
          catatan: v.catatan,
        })
        .select('id')
        .single(),
    ) as { id: string }

    cek(await db.from('cars').update({ status: 'TERBOOKING' }).eq('id', v.car_id).select('id'))

    return row
  })

  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}

/**
 * Batalkan booking sebelum lunas — unit kembali Ready Stock. DP yang sudah
 * diterima perlu direkonsiliasi manual (dikembalikan atau dianggap hangus
 * sesuai kesepakatan), sistem tidak mengasumsikan salah satunya.
 */
export async function batalkanBooking(id: string) {
  const res = await jalankan(async (db) => {
    const booking = cek(
      await db.from('bookings').select('car_id, status').eq('id', id).single(),
    ) as any
    if (booking.status !== 'AKTIF') {
      throw new Error('Booking ini sudah tidak aktif.')
    }

    cek(
      await db
        .from('bookings')
        .update({ status: 'BATAL' })
        .eq('id', id)
        .select('id'),
    )
    cek(await db.from('cars').update({ status: 'READY_STOCK' }).eq('id', booking.car_id).select('id'))
    return undefined
  })
  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}

/**
 * Pelunasan booking: dana sisa sudah diterima penuh, jadi diproses persis
 * seperti penjualan biasa — HPP dikunci, modal & bagi hasil investor
 * langsung diproses otomatis, unit jadi TERJUAL. Kalau bagi hasil gagal,
 * penjualan dibatalkan lagi dan unit balik ke TERBOOKING (bukan Ready
 * Stock — bookingnya sendiri belum batal).
 */
export async function lunasiBooking(input: unknown) {
  const parsed = lunasiBookingSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const v = parsed.data
  const biayaLain = totalRincian(v.rincian_biaya_lain)

  const res = await jalankan(async (db) => {
    const booking = cek(
      await db
        .from('bookings')
        .select('car_id, customer_id, sales_person_id, status')
        .eq('id', v.booking_id)
        .single(),
    ) as any
    if (booking.status !== 'AKTIF') {
      throw new Error('Booking ini sudah tidak aktif.')
    }

    const car = cek(await db.from('cars').select('status').eq('id', booking.car_id).single()) as any
    if (car.status !== 'TERBOOKING') {
      throw new Error('Unit ini tidak lagi berstatus Terbooking.')
    }

    const hppRow = cek(
      await db.from('v_car_hpp').select('hpp').eq('car_id', booking.car_id).single(),
    ) as any
    const hpp = Number(hppRow.hpp)

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
          car_id: booking.car_id,
          customer_id: booking.customer_id,
          sales_person_id: booking.sales_person_id,
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

    cek(await db.from('cars').update({ status: 'TERJUAL' }).eq('id', booking.car_id).select('id'))

    try {
      cek(await db.rpc('process_profit_sharing', { p_car_sale_id: row.id, p_tanggal: v.tanggal_jual }))
    } catch (e) {
      // rollback manual: penjualan gagal dibagi hasil, unit balik ke Terbooking (bookingnya belum batal)
      await db.from('car_sales').delete().eq('id', row.id)
      await db.from('cars').update({ status: 'TERBOOKING' }).eq('id', booking.car_id)
      throw e
    }

    cek(
      await db
        .from('bookings')
        .update({ status: 'SELESAI', car_sale_id: row.id })
        .eq('id', v.booking_id)
        .select('id'),
    )

    return row
  })

  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}
