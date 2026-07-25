import type { InvestorLedger } from '@/types/database'

/**
 * Versi server dari perhitungan saldo berjalan (tanpa React), dipakai
 * saat menyusun PDF laporan investor. Entri harus sudah urut tanggal menaik.
 */
export function hitungSaldoBerjalanServer(rows: InvestorLedger[]) {
  let saldo = 0
  return rows.map((r) => {
    saldo += Number(r.amount)
    return {
      tanggal: r.tanggal,
      keterangan: r.keterangan,
      amount: Number(r.amount),
      saldo,
    }
  })
}
