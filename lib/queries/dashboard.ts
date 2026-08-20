import 'server-only'
import { aman, num, LIST_LIMIT } from './base'
import { bulanDalamRentang, periodeSebelumnya, type Rentang } from '@/lib/periode'
import { formatBulan } from '@/lib/format'
import { hitungDelta, susunWaterfallHolding } from '@/lib/calc'

export type RingkasanDashboard = {
  jumlahInvestor: number
  totalInvestasi: number
  totalSaldo: number
  totalUnitTerjual: number
  totalUnitAvailable: number
  totalModalAvailable: number
  totalLabaBersih: number
  totalBagiHasil: number
  delta: {
    unitTerjual: number | null
    labaBersih: number | null
    bagiHasil: number | null
  }
}

export type DataDashboard = {
  ringkasan: RingkasanDashboard
  trend: { bulan: string; unit: number; nilai: number }[]
  waterfall: ReturnType<typeof susunWaterfallHolding>
  labaRugi: {
    pendapatan: number
    hppPembelian: number
    biayaPerbaikan: number
    komisiSales: number
    biayaPenjualanLain: number
    biayaOperasional: number
    labaBersih: number
    bagiHasilInvestor: number
    labaPengelola: number
  }
  stokTerlama: {
    id: string
    unit: string
    no_polisi: string | null
    hpp: number
    umur: number
  }[]
  penjualanTerakhir: {
    id: string
    car_id: string
    unit: string
    tanggal: string
    harga: number
    laba: number
  }[]
}

const KOSONG: DataDashboard = {
  ringkasan: {
    jumlahInvestor: 0,
    totalInvestasi: 0,
    totalSaldo: 0,
    totalUnitTerjual: 0,
    totalUnitAvailable: 0,
    totalModalAvailable: 0,
    totalLabaBersih: 0,
    totalBagiHasil: 0,
    delta: { unitTerjual: null, labaBersih: null, bagiHasil: null },
  },
  trend: [],
  waterfall: [],
  labaRugi: {
    pendapatan: 0,
    hppPembelian: 0,
    biayaPerbaikan: 0,
    komisiSales: 0,
    biayaPenjualanLain: 0,
    biayaOperasional: 0,
    labaBersih: 0,
    bagiHasilInvestor: 0,
    labaPengelola: 0,
  },
  stokTerlama: [],
  penjualanTerakhir: [],
}

/**
 * Semua angka dashboard holding untuk satu rentang periode.
 * Perbandingan delta memakai rentang sepanjang periode yang sama tepat sebelumnya.
 */
export async function getDataDashboard(rentang: Rentang) {
  return aman<DataDashboard>(async (db) => {
    const sebelum = periodeSebelumnya(rentang)

    const [
      summary,
      salesPeriode,
      salesSebelum,
      opex,
      bagiHasil,
      bagiHasilSebelum,
      stok,
    ] = await Promise.all([
      db.from('v_dashboard_summary').select('*').maybeSingle(),
      db
        .from('car_sales')
        .select('*, cars(merek, tipe, tahun, no_polisi)')
        .gte('tanggal_jual', rentang.from)
        .lte('tanggal_jual', rentang.to)
        .order('tanggal_jual', { ascending: false })
        .range(0, LIST_LIMIT - 1),
      db
        .from('car_sales')
        .select('laba_bersih, harga_jual')
        .gte('tanggal_jual', sebelum.from)
        .lte('tanggal_jual', sebelum.to),
      db
        .from('operational_expenses')
        .select('nominal')
        .gte('tanggal', rentang.from)
        .lte('tanggal', rentang.to),
      db
        .from('profit_sharings')
        .select('porsi_investor, porsi_pengelola')
        .eq('is_reversed', false)
        .gte('tanggal_proses', rentang.from)
        .lte('tanggal_proses', rentang.to),
      db
        .from('profit_sharings')
        .select('porsi_investor')
        .eq('is_reversed', false)
        .gte('tanggal_proses', sebelum.from)
        .lte('tanggal_proses', sebelum.to),
      db
        .from('v_car_overview')
        .select('id, merek, tipe, tahun, no_polisi, hpp, umur_stok_hari, status')
        .in('status', ['DIBELI', 'PERBAIKAN', 'READY_STOCK'])
        .order('umur_stok_hari', { ascending: false })
        .limit(5),
    ])

    if (summary.error) throw new Error(summary.error.message)

    const sales = (salesPeriode.data ?? []) as any[]
    const carIds = sales.map((s) => s.car_id)

    // Pisahkan HPP jadi modal pembelian vs biaya perbaikan untuk waterfall
    let hppPembelian = 0
    if (carIds.length > 0) {
      const p = await db.from('purchases').select('car_id, total_modal').in('car_id', carIds)
      hppPembelian = ((p.data ?? []) as any[]).reduce((s, r) => s + num(r.total_modal), 0)
    }

    const pendapatan = sales.reduce((s, r) => s + num(r.harga_jual), 0)
    const hppTotal = sales.reduce((s, r) => s + num(r.hpp_snapshot), 0)
    const biayaPerbaikan = Math.max(0, hppTotal - hppPembelian)
    const komisiSales = sales.reduce((s, r) => s + num(r.komisi_sales), 0)
    const biayaPenjualanLain = sales.reduce((s, r) => s + num(r.biaya_lain), 0)
    const opexTotal = ((opex.data ?? []) as any[]).reduce((s, r) => s + num(r.nominal), 0)
    const biayaOperasional = opexTotal + biayaPenjualanLain

    const labaUnit = sales.reduce((s, r) => s + num(r.laba_bersih), 0)
    const bagiHasilInvestor = ((bagiHasil.data ?? []) as any[]).reduce(
      (s, r) => s + num(r.porsi_investor),
      0,
    )
    const labaBersih = pendapatan - hppPembelian - biayaPerbaikan - komisiSales - biayaOperasional

    // Pembanding periode sebelumnya
    const salesLalu = (salesSebelum.data ?? []) as any[]
    const labaLalu = salesLalu.reduce((s, r) => s + num(r.laba_bersih), 0)
    const bagiHasilLalu = ((bagiHasilSebelum.data ?? []) as any[]).reduce(
      (s, r) => s + num(r.porsi_investor),
      0,
    )

    // Trend bulanan
    const bulanList = bulanDalamRentang(rentang)
    const perBulan = new Map<string, { unit: number; nilai: number }>()
    for (const b of bulanList) perBulan.set(b, { unit: 0, nilai: 0 })
    for (const s of sales) {
      const key = String(s.tanggal_jual).slice(0, 7)
      const cur = perBulan.get(key)
      if (!cur) continue
      cur.unit += 1
      cur.nilai += num(s.harga_jual)
    }

    const sum = (summary.data ?? {}) as any

    return {
      ringkasan: {
        jumlahInvestor: num(sum.jumlah_investor),
        totalInvestasi: num(sum.total_investasi),
        totalSaldo: num(sum.total_saldo),
        totalUnitTerjual: sales.length,
        totalUnitAvailable: num(sum.total_unit_available),
        totalModalAvailable: num(sum.total_modal_available),
        totalLabaBersih: labaUnit,
        totalBagiHasil: bagiHasilInvestor,
        delta: {
          unitTerjual: hitungDelta(sales.length, salesLalu.length),
          labaBersih: hitungDelta(labaUnit, labaLalu),
          bagiHasil: hitungDelta(bagiHasilInvestor, bagiHasilLalu),
        },
      },
      trend: bulanList.map((b) => ({
        bulan: formatBulan(`${b}-01`),
        unit: perBulan.get(b)?.unit ?? 0,
        nilai: perBulan.get(b)?.nilai ?? 0,
      })),
      waterfall: susunWaterfallHolding({
        pendapatan,
        hppPembelian,
        biayaPerbaikan,
        komisiSales,
        biayaOperasional,
        bagiHasilInvestor,
      }),
      labaRugi: {
        pendapatan,
        hppPembelian,
        biayaPerbaikan,
        komisiSales,
        biayaPenjualanLain,
        biayaOperasional: opexTotal,
        labaBersih,
        bagiHasilInvestor,
        labaPengelola: labaBersih - bagiHasilInvestor,
      },
      stokTerlama: ((stok.data ?? []) as any[]).map((c) => ({
        id: c.id,
        unit: `${c.merek} ${c.tipe} ${c.tahun}`,
        no_polisi: c.no_polisi,
        hpp: num(c.hpp),
        umur: num(c.umur_stok_hari),
      })),
      penjualanTerakhir: sales.slice(0, 5).map((s) => ({
        id: s.id,
        car_id: s.car_id,
        unit: s.cars ? `${s.cars.merek} ${s.cars.tipe} ${s.cars.tahun}` : '-',
        tanggal: s.tanggal_jual,
        harga: num(s.harga_jual),
        laba: num(s.laba_bersih),
      })),
    }
  }, KOSONG)
}

/** Rincian laba rugi per unit untuk halaman laporan (expandable row). */
export async function getLaporanPerUnit(rentang: Rentang) {
  return aman(async (db) => {
    const sales = (
      await db
        .from('car_sales')
        .select('*, cars(merek, tipe, tahun, no_polisi)')
        .gte('tanggal_jual', rentang.from)
        .lte('tanggal_jual', rentang.to)
        .order('tanggal_jual', { ascending: false })
        .range(0, LIST_LIMIT - 1)
    ).data as any[]

    if (!sales || sales.length === 0) return []

    const carIds = sales.map((s) => s.car_id)
    const [purchases, repairs, sharings] = await Promise.all([
      db.from('purchases').select('car_id, total_modal').in('car_id', carIds),
      db.from('repairs').select('car_id, biaya, jenis_perbaikan').in('car_id', carIds),
      db
        .from('profit_sharings')
        .select('car_id, porsi_investor, porsi_pengelola, is_reversed')
        .in('car_id', carIds),
    ])

    const beli = new Map<string, number>()
    for (const p of ((purchases.data ?? []) as any[])) beli.set(p.car_id, num(p.total_modal))

    const perbaikan = new Map<string, number>()
    for (const r of ((repairs.data ?? []) as any[])) {
      perbaikan.set(r.car_id, (perbaikan.get(r.car_id) ?? 0) + num(r.biaya))
    }

    const bagi = new Map<string, { investor: number; pengelola: number }>()
    for (const s of ((sharings.data ?? []) as any[])) {
      if (s.is_reversed) continue
      bagi.set(s.car_id, {
        investor: num(s.porsi_investor),
        pengelola: num(s.porsi_pengelola),
      })
    }

    return sales.map((s) => ({
      id: s.id as string,
      car_id: s.car_id as string,
      no_transaksi: s.no_transaksi as string,
      unit: s.cars ? `${s.cars.merek} ${s.cars.tipe} ${s.cars.tahun}` : '-',
      no_polisi: s.cars?.no_polisi ?? null,
      tanggal_jual: s.tanggal_jual as string,
      harga_jual: num(s.harga_jual),
      modal_pembelian: beli.get(s.car_id) ?? 0,
      biaya_perbaikan: perbaikan.get(s.car_id) ?? 0,
      hpp: num(s.hpp_snapshot),
      komisi_sales: num(s.komisi_sales),
      biaya_lain: num(s.biaya_lain),
      laba_kotor: num(s.laba_kotor),
      laba_bersih: num(s.laba_bersih),
      bagi_hasil_investor: bagi.get(s.car_id)?.investor ?? 0,
      bagi_hasil_pengelola: bagi.get(s.car_id)?.pengelola ?? 0,
      sudah_dibagi: Boolean(s.is_profit_shared),
    }))
  }, [] as any[])
}

/** Daftar tahun yang punya data transaksi — dipakai isi dropdown slicer tahun. */
export async function getTahunTersedia() {
  return aman<number[]>(async (db) => {
    const [beli, jual] = await Promise.all([
      db.from('purchases').select('tanggal_beli').order('tanggal_beli', { ascending: true }).limit(1),
      db.from('car_sales').select('tanggal_jual').order('tanggal_jual', { ascending: false }).limit(1),
    ])
    const tahunSekarang = new Date().getFullYear()
    const tahunAwal = beli.data?.[0]?.tanggal_beli
      ? Number(String(beli.data[0].tanggal_beli).slice(0, 4))
      : tahunSekarang
    const tahunAkhir = jual.data?.[0]?.tanggal_jual
      ? Number(String(jual.data[0].tanggal_jual).slice(0, 4))
      : tahunSekarang
    const dari = Math.min(tahunAwal, tahunSekarang)
    const sampai = Math.max(tahunAkhir, tahunSekarang)
    const tahun: number[] = []
    for (let y = sampai; y >= dari; y--) tahun.push(y)
    return tahun
  }, [new Date().getFullYear()])
}

/** Total biaya operasional pada rentang tanggal bebas — dipakai hitung delta. */
export async function getTotalBiaya(from: string, to: string) {
  const res = await aman<number>(async (db) => {
    const r = await db
      .from('operational_expenses')
      .select('nominal')
      .gte('tanggal', from)
      .lte('tanggal', to)
    if (r.error) throw new Error(r.error.message)
    return ((r.data ?? []) as any[]).reduce((s, x) => s + num(x.nominal), 0)
  }, 0)
  return res.data
}

/** Daftar biaya operasional dalam periode (halaman laporan). */
export async function getBiayaOperasional(rentang: Rentang) {
  return aman(async (db) => {
    const r = await db
      .from('operational_expenses')
      .select('*')
      .gte('tanggal', rentang.from)
      .lte('tanggal', rentang.to)
      .order('tanggal', { ascending: false })
    if (r.error) throw new Error(r.error.message)
    return ((r.data ?? []) as any[]).map((x) => ({ ...x, nominal: num(x.nominal) }))
  }, [] as any[])
}
