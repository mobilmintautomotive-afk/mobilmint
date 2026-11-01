'use server'

import { revalidatePath } from 'next/cache'
import { jalankan, cek } from './_helper'
import { perbaikanSchema } from '@/lib/validations'

const PATHS = [
  '/transaksi/perbaikan',
  '/transaksi/stock',
  '/master/mobil',
  '/dashboard',
  '/laporan/laba-rugi',
]

/**
 * Simpan perbaikan. Biaya perbaikan langsung menambah HPP unit
 * (lewat view v_car_hpp), tidak perlu update kolom apapun.
 *
 * Kalau `ambil_dari_modal` dicentang, biaya juga dipotong dari saldo investor
 * secara proporsional sesuai porsi funding unit tersebut.
 */
export async function simpanPerbaikan(input: unknown) {
  const parsed = perbaikanSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const v = parsed.data

  const res = await jalankan(async (db) => {
    const car = cek(await db.from('cars').select('status').eq('id', v.car_id).single()) as any
    if (!['DIBELI', 'PERBAIKAN', 'READY_STOCK', 'TERBOOKING'].includes(car.status)) {
      throw new Error('Unit yang sudah terjual tidak bisa ditambahkan perbaikan.')
    }

    const values = {
      car_id: v.car_id,
      vendor_id: v.vendor_id || null,
      jenis_perbaikan: v.jenis_perbaikan,
      deskripsi: v.deskripsi,
      biaya: v.biaya,
      tanggal_masuk: v.tanggal_masuk,
      tanggal_selesai: v.tanggal_selesai || null,
      status: v.status,
      ambil_dari_modal: v.ambil_dari_modal,
    }

    // Edit lewat RPC atomik supaya potongan modal investor (ALOKASI_MODAL)
    // ikut disesuaikan dengan biaya / centang ambil_dari_modal yang baru.
    if (v.id) {
      cek(
        await db.rpc('update_repair_funding', {
          p_repair_id: v.id,
          p_car_id: values.car_id,
          p_vendor_id: values.vendor_id,
          p_jenis_perbaikan: values.jenis_perbaikan,
          p_deskripsi: values.deskripsi,
          p_biaya: values.biaya,
          p_tanggal_masuk: values.tanggal_masuk,
          p_tanggal_selesai: values.tanggal_selesai,
          p_status: values.status,
          p_ambil_dari_modal: values.ambil_dari_modal,
        }),
      )
      return { id: v.id }
    }

    const row = cek(await db.from('repairs').insert(values).select('id').single()) as { id: string }

    if (v.ambil_dari_modal && v.biaya > 0) {
      try {
        cek(await db.rpc('allocate_repair_funding', { p_repair_id: row.id }))
      } catch (e) {
        await db.from('repairs').delete().eq('id', row.id)
        throw e
      }
    }

    // perbaikan pertama mengubah status unit jadi PERBAIKAN
    if (car.status === 'DIBELI') {
      cek(await db.from('cars').update({ status: 'PERBAIKAN' }).eq('id', v.car_id).select('id'))
    }

    return row
  })

  if (res.ok) {
    PATHS.forEach((p) => revalidatePath(p))
    revalidatePath('/master/investor')
    revalidatePath('/investor')
  }
  return res
}

export async function hapusPerbaikan(id: string) {
  const res = await jalankan(async (db) => {
    const r = cek(
      await db.from('repairs').select('ambil_dari_modal').eq('id', id).single(),
    ) as any
    if (r.ambil_dari_modal) {
      throw new Error(
        'Perbaikan ini sudah memotong saldo investor, jadi tidak bisa dihapus. Buat penyesuaian manual kalau perlu dikoreksi.',
      )
    }
    cek(await db.from('repairs').delete().eq('id', id).select('id'))
    return undefined
  })
  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}

/** Tandai satu record perbaikan selesai (tidak mengubah status unit). */
export async function selesaikanPerbaikan(id: string, tanggalSelesai: string) {
  const res = await jalankan(async (db) => {
    cek(
      await db
        .from('repairs')
        .update({ status: 'SELESAI', tanggal_selesai: tanggalSelesai })
        .eq('id', id)
        .select('id'),
    )
    return undefined
  })
  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}
