import 'server-only'
import { aman, num } from './base'
import { todayJakarta } from '@/lib/format'

export type NeracaPengelola = {
  perTanggal: string
  asetTetapNilaiBuku: number
  modalPengelola: number
  /**
   * Estimasi historis SEKADAR INFORMASI — bukan saldo kas riil, karena
   * praktiknya porsi pengelola langsung ditarik begitu bagi hasil diproses,
   * tidak tertahan di pool. Jangan dimasukkan ke tabel neraca (biar tidak
   * menyesatkan seolah ada kas yang benar-benar mengendap).
   */
  estimasiLabaDitahanKalauTidakDitarik: number
  totalOpex: number
  porsiPengelolaRealized: number
  rincianAset: {
    id: string
    nama: string
    kategori: string
    tanggal_beli: string
    harga_beli: number
    akumulasi_penyusutan: number
    nilai_buku: number
  }[]
}

const KOSONG: NeracaPengelola = {
  perTanggal: '',
  asetTetapNilaiBuku: 0,
  modalPengelola: 0,
  estimasiLabaDitahanKalauTidakDitarik: 0,
  totalOpex: 0,
  porsiPengelolaRealized: 0,
  rincianAset: [],
}

/**
 * Neraca Pengelola — SENGAJA sederhana, hanya Aset Tetap perusahaan.
 *
 * Kenapa bukan "kas pengelola" seperti versi awal: begitu bagi hasil
 * diproses, porsi pengelola pada dasarnya langsung ditarik ke rekening
 * pribadi, tidak tertahan di pool. Jadi tidak ada baris "kas" yang jujur
 * bisa ditampilkan sebagai bagian neraca resmi — Aset Tetap adalah satu-
 * satunya jejak uang pengelola yang benar-benar masih "ada wujudnya" di
 * bisnis. Aset = Modal selalu balance trivial (harga_beli - penyusutan =
 * nilai_buku = modal yang tertanam di aset itu).
 *
 * Untuk Laba Rugi Pengelola, lihat /laporan/laba-rugi — baris paling
 * bawah ("Laba Bersih Pengelola") itu sudah tepat, tidak perlu laporan
 * terpisah.
 */
export async function getNeracaPengelola() {
  return aman<NeracaPengelola>(async (db) => {
    const [sharings, opex, aset] = await Promise.all([
      db.from('profit_sharings').select('porsi_pengelola').eq('is_reversed', false),
      db.from('operational_expenses').select('nominal'),
      db.from('v_asset_book_value').select('*').eq('status', 'AKTIF'),
    ])
    if (sharings.error) throw new Error(sharings.error.message)

    const porsiPengelolaRealized = ((sharings.data ?? []) as any[]).reduce(
      (s, r) => s + num(r.porsi_pengelola),
      0,
    )
    const totalOpex = ((opex.data ?? []) as any[]).reduce((s, r) => s + num(r.nominal), 0)

    const rincianAset = ((aset.data ?? []) as any[]).map((a) => ({
      id: a.id as string,
      nama: a.nama as string,
      kategori: a.kategori as string,
      tanggal_beli: a.tanggal_beli as string,
      harga_beli: num(a.harga_beli),
      akumulasi_penyusutan: num(a.akumulasi_penyusutan),
      nilai_buku: num(a.nilai_buku),
    }))
    const asetTetapNilaiBuku = rincianAset.reduce((s, a) => s + a.nilai_buku, 0)
    const totalHargaBeliAset = rincianAset.reduce((s, a) => s + a.harga_beli, 0)

    return {
      perTanggal: todayJakarta(),
      asetTetapNilaiBuku,
      modalPengelola: asetTetapNilaiBuku,
      estimasiLabaDitahanKalauTidakDitarik: porsiPengelolaRealized - totalOpex - totalHargaBeliAset,
      totalOpex,
      porsiPengelolaRealized,
      rincianAset,
    }
  }, KOSONG)
}
