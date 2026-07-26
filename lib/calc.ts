/**
 * SEMUA rumus keuangan MobilMint terpusat di file ini.
 * Jangan menulis ulang perhitungan laba/bagi hasil di komponen manapun.
 * (PRD 03-tech-stack-data-model.md bagian 5.2)
 *
 * Aturan angka: uang diproses sebagai rupiah penuh (integer). Setiap
 * pembagian proporsional wajib melewati `distribusiProporsional()` supaya
 * sisa pembulatan tidak hilang.
 */

export type AlokasiInput = {
  investor_id: string
  nama: string
  saldo: number
}

export type AlokasiHasil = AlokasiInput & {
  porsi_pct: number
  amount: number
}

export type RincianBiaya = { nama: string; nominal: number }

const rp = (n: number) => Math.round(n)

/** HPP Unit = harga beli + biaya lain + total biaya perbaikan */
export function hitungHPP(input: {
  hargaBeli: number
  biayaLain: number
  totalPerbaikan: number
}): number {
  return rp(input.hargaBeli + input.biayaLain + input.totalPerbaikan)
}

export type HasilPenjualan = {
  hargaJual: number
  hpp: number
  labaKotor: number
  komisiSales: number
  biayaLain: number
  labaBersih: number
  porsiInvestor: number
  porsiPengelola: number
  nisbahInvestorPct: number
  rugi: boolean
}

/**
 * Laba Kotor  = harga_jual - HPP
 * Laba Bersih = Laba Kotor - komisi_sales - biaya_penjualan_lain
 * Porsi Investor = Laba Bersih x nisbah_investor_pct
 *
 * Nilai negatif TIDAK di-clamp ke 0 — kerugian memang harus tampil minus.
 */
export function hitungPenjualan(input: {
  hargaJual: number
  hpp: number
  komisiSales: number
  biayaLain: number
  nisbahInvestorPct: number
}): HasilPenjualan {
  const hargaJual = rp(input.hargaJual)
  const hpp = rp(input.hpp)
  const komisiSales = rp(input.komisiSales)
  const biayaLain = rp(input.biayaLain)

  const labaKotor = hargaJual - hpp
  const labaBersih = labaKotor - komisiSales - biayaLain
  const porsiInvestor = rp((labaBersih * input.nisbahInvestorPct) / 100)
  const porsiPengelola = labaBersih - porsiInvestor

  return {
    hargaJual,
    hpp,
    labaKotor,
    komisiSales,
    biayaLain,
    labaBersih,
    porsiInvestor,
    porsiPengelola,
    nisbahInvestorPct: input.nisbahInvestorPct,
    rugi: labaBersih < 0,
  }
}

/**
 * Nisbah investor satu unit, ditimbang terhadap besar modal masing-masing
 * pendana.
 *
 * Sejak urun dana dibatasi hanya untuk investor bernisbah sama, semua
 * pendana satu unit selalu punya nisbah identik sehingga hasilnya sama
 * dengan nisbah itu sendiri. Rumus tertimbang dipertahankan sebagai
 * pengaman untuk baris lama dari sebelum aturan tersebut berlaku.
 */
export function nisbahTertimbang(
  fundings: { amount: number; nisbah_investor_pct: number }[],
): number {
  const total = fundings.reduce((s, f) => s + f.amount, 0)
  if (total <= 0) return 0
  const bobot = fundings.reduce((s, f) => s + f.amount * f.nisbah_investor_pct, 0)
  return bobot / total
}

/**
 * Bagi `total` ke beberapa baris sesuai bobot, dengan jaminan
 * SUM(hasil) === total (tidak ada rupiah yang hilang/muncul).
 * Selisih pembulatan dibebankan ke baris dengan bobot terbesar.
 */
export function distribusiProporsional(
  total: number,
  bobot: number[],
  opts?: { maks?: number[] },
): number[] {
  const totalBobot = bobot.reduce((s, b) => s + b, 0)
  if (totalBobot <= 0 || bobot.length === 0) return bobot.map(() => 0)

  const target = rp(total)
  let hasil = bobot.map((b) => rp((target * b) / totalBobot))

  if (opts?.maks) {
    hasil = hasil.map((v, i) => {
      const maks = opts.maks![i]
      return maks !== undefined && v > maks ? rp(maks) : v
    })
  }

  const selisih = target - hasil.reduce((s, v) => s + v, 0)
  if (selisih !== 0) {
    // urutkan index berdasarkan bobot terbesar, cari yang masih muat
    const urut = bobot.map((b, i) => ({ b, i })).sort((a, z) => z.b - a.b)
    for (const { i } of urut) {
      const maks = opts?.maks?.[i]
      if (maks === undefined || hasil[i] + selisih <= maks) {
        hasil[i] += selisih
        break
      }
    }
  }

  return hasil
}

/**
 * Alokasi modal pembelian, default proporsional terhadap saldo tersedia.
 * Dipakai untuk preview di UI; server tetap memvalidasi ulang lewat
 * function `allocate_purchase_funding`.
 */
export function hitungAlokasiProporsional(
  totalModal: number,
  investors: AlokasiInput[],
): AlokasiHasil[] {
  const kandidat = investors.filter((i) => i.saldo > 0)
  const totalSaldo = kandidat.reduce((s, i) => s + i.saldo, 0)
  if (totalSaldo <= 0) return []

  const amounts = distribusiProporsional(
    totalModal,
    kandidat.map((i) => i.saldo),
    { maks: kandidat.map((i) => i.saldo) },
  )

  return kandidat
    .map((inv, idx) => ({
      ...inv,
      porsi_pct: Number(((inv.saldo / totalSaldo) * 100).toFixed(4)),
      amount: amounts[idx],
    }))
    .sort((a, z) => z.amount - a.amount)
}

export type ValidasiAlokasi = {
  valid: boolean
  totalAlokasi: number
  kurang: number
  pesan: string[]
}

export function validasiAlokasi(
  totalModal: number,
  rows: { nama: string; saldo: number; amount: number }[],
): ValidasiAlokasi {
  const pesan: string[] = []
  const totalAlokasi = rows.reduce((s, r) => s + r.amount, 0)

  for (const r of rows) {
    if (r.amount < 0) pesan.push(`Alokasi ${r.nama} tidak boleh negatif.`)
    if (r.amount > r.saldo) {
      pesan.push(`Alokasi ${r.nama} melebihi saldonya.`)
    }
  }

  const selisih = totalModal - totalAlokasi
  if (selisih !== 0) {
    pesan.push(
      selisih > 0
        ? `Alokasi masih kurang ${selisih.toLocaleString('id-ID')}.`
        : `Alokasi kelebihan ${Math.abs(selisih).toLocaleString('id-ID')}.`,
    )
  }

  return {
    valid: pesan.length === 0,
    totalAlokasi,
    kurang: selisih,
    pesan,
  }
}

export type BarisBagiHasil = {
  investor_id: string
  nama: string
  modal: number
  porsi_pct: number
  bagi_hasil: number
  modal_kembali: number
  total_kembali: number
}

/**
 * Simulasi bagi hasil satu unit.
 *
 * Kalau laba bersih negatif, `bagi_hasil` ikut negatif sehingga
 * `total_kembali` (modal + bagi hasil) otomatis lebih kecil dari modal.
 * Tidak ada angka yang di-clamp ke 0.
 */
export function simulasiBagiHasil(input: {
  labaBersih: number
  fundings: {
    investor_id: string
    nama: string
    amount: number
    nisbah_investor_pct: number
  }[]
}): {
  totalModal: number
  nisbahPct: number
  porsiInvestor: number
  porsiPengelola: number
  rows: BarisBagiHasil[]
} {
  const totalModal = input.fundings.reduce((s, f) => s + f.amount, 0)
  const nisbahPct = nisbahTertimbang(input.fundings)
  const porsiInvestor = rp((input.labaBersih * nisbahPct) / 100)
  const porsiPengelola = rp(input.labaBersih) - porsiInvestor

  const bagiHasil = distribusiProporsional(
    porsiInvestor,
    input.fundings.map((f) => f.amount),
  )

  const rows = input.fundings.map((f, i) => ({
    investor_id: f.investor_id,
    nama: f.nama,
    modal: f.amount,
    porsi_pct: totalModal > 0 ? Number(((f.amount / totalModal) * 100).toFixed(4)) : 0,
    bagi_hasil: bagiHasil[i],
    modal_kembali: f.amount,
    total_kembali: f.amount + bagiHasil[i],
  }))

  return { totalModal, nisbahPct, porsiInvestor, porsiPengelola, rows }
}

export type BarisWaterfall = {
  label: string
  value: number
  tipe: 'naik' | 'turun' | 'total'
}

/**
 * Data waterfall laba rugi holding (PRD 02 bagian C1).
 * Urutan: Pendapatan → (-)HPP → (-)Perbaikan → (-)Komisi → (-)Operasional
 *         → Laba Bersih → (-)Bagi Hasil Investor → Laba Pengelola
 */
export function susunWaterfallHolding(input: {
  pendapatan: number
  hppPembelian: number
  biayaPerbaikan: number
  komisiSales: number
  biayaOperasional: number
  bagiHasilInvestor: number
}): BarisWaterfall[] {
  const labaBersih =
    input.pendapatan -
    input.hppPembelian -
    input.biayaPerbaikan -
    input.komisiSales -
    input.biayaOperasional

  return [
    { label: 'Pendapatan Penjualan', value: input.pendapatan, tipe: 'naik' },
    { label: 'HPP Pembelian', value: -input.hppPembelian, tipe: 'turun' },
    { label: 'Biaya Perbaikan', value: -input.biayaPerbaikan, tipe: 'turun' },
    { label: 'Komisi Sales', value: -input.komisiSales, tipe: 'turun' },
    { label: 'Biaya Operasional', value: -input.biayaOperasional, tipe: 'turun' },
    { label: 'Laba Bersih', value: labaBersih, tipe: 'total' },
    { label: 'Bagi Hasil Investor', value: -input.bagiHasilInvestor, tipe: 'turun' },
    { label: 'Laba Pengelola', value: labaBersih - input.bagiHasilInvestor, tipe: 'total' },
  ]
}

/**
 * Waterfall versi investor — sengaja lebih sederhana & tanpa istilah akuntansi.
 * Modal Anda → (+) Bagi Hasil → (-) Penarikan → Saldo Saat Ini
 */
export function susunWaterfallInvestor(input: {
  totalSetoran: number
  totalBagiHasil: number
  totalPenarikan: number
  saldo: number
}): BarisWaterfall[] {
  return [
    { label: 'Modal Anda', value: input.totalSetoran, tipe: 'naik' },
    { label: 'Bagi Hasil', value: input.totalBagiHasil, tipe: input.totalBagiHasil < 0 ? 'turun' : 'naik' },
    { label: 'Penarikan', value: -input.totalPenarikan, tipe: 'turun' },
    { label: 'Saldo Saat Ini', value: input.saldo, tipe: 'total' },
  ]
}

/** Total biaya dari repeatable rows (biaya lain pembelian/penjualan). */
export function totalRincian(rows: RincianBiaya[] | null | undefined): number {
  if (!rows) return 0
  return rp(rows.reduce((s, r) => s + (Number(r.nominal) || 0), 0))
}

/** Perbandingan periode: `+12%` / `-4%`. Null kalau pembanding nol. */
export function hitungDelta(sekarang: number, sebelumnya: number): number | null {
  if (!sebelumnya) return null
  return ((sekarang - sebelumnya) / Math.abs(sebelumnya)) * 100
}
