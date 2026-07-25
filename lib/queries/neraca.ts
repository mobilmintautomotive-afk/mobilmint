import 'server-only'
import { aman, num } from './base'
import { todayJakarta } from '@/lib/format'

export type DataNeraca = {
  perTanggal: string
  aset: {
    kasInvestorIdle: number
    kasPenjualanPending: number
    modalDiUnit: number
    kasPengelola: number
    asetTetapNilaiBuku: number
    total: number
  }
  kewajibanModal: {
    kewajibanInvestor: number
    modalPengelola: number
    labaDitahanPending: number
    klaimPerbaikanBelumRealisasi: number
    total: number
  }
  /** Selisih aset vs kewajiban+modal — harus 0. Kalau tidak, ada bug/data korup. */
  selisih: number
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

const KOSONG: DataNeraca = {
  perTanggal: '',
  aset: {
    kasInvestorIdle: 0,
    kasPenjualanPending: 0,
    modalDiUnit: 0,
    kasPengelola: 0,
    asetTetapNilaiBuku: 0,
    total: 0,
  },
  kewajibanModal: {
    kewajibanInvestor: 0,
    modalPengelola: 0,
    labaDitahanPending: 0,
    klaimPerbaikanBelumRealisasi: 0,
    total: 0,
  },
  selisih: 0,
  rincianAset: [],
}

/**
 * Laporan Neraca — dihitung real-time dari data yang sudah ada, TANPA
 * tabel ledger baru. Model yang dipakai (lihat penjelasan tiap baris):
 *
 * ASET
 *   Kas & Setara Kas          = SUM(saldo investor idle)
 *   Kas Penjualan Pending     = SUM(harga_jual - komisi - biaya_lain) unit TERJUAL yg belum diproses bagi hasil
 *   Modal Tertanam di Unit    = SUM(HPP) unit DIBELI/PERBAIKAN/READY_STOCK
 *   Kas Pengelola             = SUM(porsi_pengelola realized) - opex - harga_beli semua aset
 *   Aset Tetap (Nilai Buku)   = SUM(nilai_buku) aset aktif
 *
 * KEWAJIBAN & MODAL
 *   Kewajiban ke Investor           = SUM(saldo investor idle) + SUM(car_fundings) unit belum SELESAI
 *   Modal Pengelola                 = SUM(porsi_pengelola realized) - opex - akumulasi penyusutan aset
 *   Laba Ditahan — Pending          = SUM(laba_bersih) unit TERJUAL yg belum diproses bagi hasil
 *   Klaim Perbaikan Belum Realisasi = SUM(biaya) perbaikan unit belum SELESAI yg TIDAK diambil dari modal
 *
 * Catatan penting soal baris terakhir ("Klaim Perbaikan Belum Realisasi"):
 * biaya perbaikan yang dibayar dari kas pengelola (ambil_dari_modal = false)
 * TIDAK hilang — uangnya berubah jadi nilai tertanam di unit (menaikkan HPP,
 * makanya ikut menaikkan "Modal Tertanam di Unit" / "Kas Penjualan Pending"
 * di sisi Aset). Karena itu pengelola punya KLAIM atas nilai itu, ditulis
 * sebagai baris tersendiri di sisi Kewajiban & Modal (bukan pengurang Kas
 * Pengelola) — akan otomatis "lunas" dan hilang dari baris ini begitu unit
 * itu SELESAI (bagi hasil diproses, karena laba_bersih saat itu sudah
 * memperhitungkan HPP yang sudah termasuk perbaikan).
 */
export async function getDataNeraca() {
  return aman<DataNeraca>(async (db) => {
    const [bal, penjualanPending, unitBelumJual, sharings, opex, aset, fundings, repairs] =
      await Promise.all([
        db.from('v_investor_balance').select('saldo'),
        db
          .from('car_sales')
          .select('harga_jual, komisi_sales, biaya_lain, laba_bersih')
          .eq('is_profit_shared', false),
        db.from('v_car_overview').select('hpp').in('status', ['DIBELI', 'PERBAIKAN', 'READY_STOCK']),
        db.from('profit_sharings').select('porsi_pengelola').eq('is_reversed', false),
        db.from('operational_expenses').select('nominal'),
        db.from('v_asset_book_value').select('*').eq('status', 'AKTIF'),
        db.from('car_fundings').select('amount, cars(status)'),
        db.from('repairs').select('biaya, ambil_dari_modal, cars(status)'),
      ])

    if (bal.error) throw new Error(bal.error.message)

    const kasInvestorIdle = ((bal.data ?? []) as any[]).reduce((s, r) => s + num(r.saldo), 0)

    const pending = (penjualanPending.data ?? []) as any[]
    const kasPenjualanPending = pending.reduce(
      (s, r) => s + (num(r.harga_jual) - num(r.komisi_sales) - num(r.biaya_lain)),
      0,
    )
    const labaDitahanPending = pending.reduce((s, r) => s + num(r.laba_bersih), 0)

    const modalDiUnit = ((unitBelumJual.data ?? []) as any[]).reduce((s, r) => s + num(r.hpp), 0)

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
    const totalHargaBeliAset = rincianAset.reduce((s, a) => s + a.harga_beli, 0)
    const totalAkumulasiPenyusutan = rincianAset.reduce((s, a) => s + a.akumulasi_penyusutan, 0)
    const asetTetapNilaiBuku = rincianAset.reduce((s, a) => s + a.nilai_buku, 0)

    const kasPengelola = porsiPengelolaRealized - totalOpex - totalHargaBeliAset
    const modalPengelola = porsiPengelolaRealized - totalOpex - totalAkumulasiPenyusutan

    // Kewajiban investor: saldo idle + prinsipal yang masih tertanam di unit
    // (DIBELI/PERBAIKAN/READY_STOCK/TERJUAL) — dikecualikan unit yang sudah SELESAI.
    const kewajibanInvestor =
      kasInvestorIdle +
      ((fundings.data ?? []) as any[])
        .filter((f) => f.cars?.status && f.cars.status !== 'SELESAI')
        .reduce((s, f) => s + num(f.amount), 0)

    // Klaim pengelola atas biaya perbaikan yang sudah dibayar (kas keluar,
    // masuk ke nilai unit) tapi unitnya belum SELESAI — lihat catatan di atas.
    const klaimPerbaikanBelumRealisasi = ((repairs.data ?? []) as any[])
      .filter((r) => !r.ambil_dari_modal && r.cars?.status && r.cars.status !== 'SELESAI')
      .reduce((s, r) => s + num(r.biaya), 0)

    const totalAset =
      kasInvestorIdle + kasPenjualanPending + modalDiUnit + kasPengelola + asetTetapNilaiBuku
    const totalKewajibanModal =
      kewajibanInvestor + modalPengelola + labaDitahanPending + klaimPerbaikanBelumRealisasi

    return {
      perTanggal: todayJakarta(),
      aset: {
        kasInvestorIdle,
        kasPenjualanPending,
        modalDiUnit,
        kasPengelola,
        asetTetapNilaiBuku,
        total: totalAset,
      },
      kewajibanModal: {
        kewajibanInvestor,
        modalPengelola,
        labaDitahanPending,
        klaimPerbaikanBelumRealisasi,
        total: totalKewajibanModal,
      },
      selisih: Math.round(totalAset - totalKewajibanModal),
      rincianAset,
    }
  }, KOSONG)
}
