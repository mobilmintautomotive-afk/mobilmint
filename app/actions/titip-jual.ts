'use server'

import { revalidatePath } from 'next/cache'
import { jalankan, cek } from './_helper'
import {
  titipJualSchema,
  selesaikanJasaKontenSchema,
  jualKonsinyasiSchema,
  tarikKonsinyasiSchema,
} from '@/lib/validations'

const PATHS = ['/transaksi/titip-jual', '/transaksi/kas', '/transaksi/pencairan', '/laporan/neraca']

/** Daftarkan unit titip jual baru — masih PROSES, belum ada uang yang pindah. */
export async function buatTitipJual(input: unknown) {
  const parsed = titipJualSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const v = parsed.data

  const res = await jalankan(async (db) => {
    const no = cek(await db.rpc('fn_next_doc_number', { p_prefix: 'TTP', p_date: v.tanggal_masuk }))

    const row = cek(
      await db
        .from('consignments')
        .insert({
          no_titip: no,
          skema: v.skema,
          merek: v.merek,
          tipe: v.tipe,
          tahun: v.tahun,
          no_polisi: v.no_polisi,
          nama_pemilik: v.nama_pemilik,
          no_tlp_pemilik: v.no_tlp_pemilik,
          tanggal_masuk: v.tanggal_masuk,
          fee_jasa: v.fee_jasa,
          harga_setor: v.skema === 'KONSINYASI' ? v.harga_setor : null,
          catatan: v.catatan,
        })
        .select('id')
        .single(),
    ) as { id: string }

    return row
  })

  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}

/** Batalkan pendaftaran titip jual — cuma boleh selagi masih PROSES (belum ada uang tercatat). */
export async function hapusTitipJual(id: string) {
  const res = await jalankan(async (db) => {
    const row = cek(await db.from('consignments').select('status').eq('id', id).single()) as any
    if (row.status !== 'PROSES') {
      throw new Error('Transaksi yang sudah ditutup tidak bisa dihapus.')
    }
    cek(await db.from('consignments').delete().eq('id', id).select('id'))
    return undefined
  })
  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}

/** Tutup skema Jasa Konten — fee_jasa yang sudah diisi saat pendaftaran jadi pendapatannya. */
export async function selesaikanJasaKonten(input: unknown) {
  const parsed = selesaikanJasaKontenSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const v = parsed.data

  const res = await jalankan(async (db) => {
    const row = cek(
      await db.from('consignments').select('skema, status, fee_jasa').eq('id', v.id).single(),
    ) as any
    if (row.skema !== 'JASA_KONTEN') throw new Error('Transaksi ini bukan skema Jasa Konten.')
    if (row.status !== 'PROSES') throw new Error('Transaksi ini sudah ditutup.')

    cek(
      await db
        .from('consignments')
        .update({ status: 'SELESAI', tanggal_selesai: v.tanggal_selesai, pendapatan: row.fee_jasa })
        .eq('id', v.id)
        .select('id'),
    )
    return undefined
  })
  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}

/** Tandai unit konsinyasi laku — untung MobilMint = harga jual dikurangi harga setor ke pemilik. */
export async function jualKonsinyasi(input: unknown) {
  const parsed = jualKonsinyasiSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const v = parsed.data

  const res = await jalankan(async (db) => {
    const row = cek(
      await db.from('consignments').select('skema, status, harga_setor').eq('id', v.id).single(),
    ) as any
    if (row.skema !== 'KONSINYASI') throw new Error('Transaksi ini bukan skema Konsinyasi.')
    if (row.status !== 'PROSES') throw new Error('Transaksi ini sudah ditutup.')

    const hargaSetor = Number(row.harga_setor ?? 0)
    if (v.harga_jual < hargaSetor) {
      throw new Error('Harga jual tidak boleh lebih kecil dari harga setor ke pemilik.')
    }

    cek(
      await db
        .from('consignments')
        .update({
          status: 'TERJUAL',
          tanggal_selesai: v.tanggal_selesai,
          harga_jual: v.harga_jual,
          pendapatan: v.harga_jual - hargaSetor,
        })
        .eq('id', v.id)
        .select('id'),
    )
    return undefined
  })
  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}

/** Unit konsinyasi ditarik pemiliknya sebelum laku — kena biaya penarikan. */
export async function tarikKonsinyasi(input: unknown) {
  const parsed = tarikKonsinyasiSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const v = parsed.data

  const res = await jalankan(async (db) => {
    const row = cek(await db.from('consignments').select('skema, status').eq('id', v.id).single()) as any
    if (row.skema !== 'KONSINYASI') throw new Error('Transaksi ini bukan skema Konsinyasi.')
    if (row.status !== 'PROSES') throw new Error('Transaksi ini sudah ditutup.')

    cek(
      await db
        .from('consignments')
        .update({ status: 'DITARIK', tanggal_selesai: v.tanggal_selesai, pendapatan: v.biaya_penarikan })
        .eq('id', v.id)
        .select('id'),
    )
    return undefined
  })
  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}
