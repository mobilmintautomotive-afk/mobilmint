import 'server-only'
import { aman, num } from './base'
import { normalisasiCar } from './master'
import { formatBulan, umurHari } from '@/lib/format'
import { susunWaterfallInvestor, type BarisWaterfall } from '@/lib/calc'
import type { InvestorLedger, CarOverview } from '@/types/database'

export type DashboardInvestor = {
  nama: string
  nisbahPct: number | null
  saldo: number
  totalInvestasi: number
  totalBagiHasil: number
  totalPenarikan: number
  modalBerjalan: number
  unitBerjalan: number
  unitTerjual: number
  punyaAkadAktif: boolean
  ledger: InvestorLedger[]
  unitDidanai: {
    car_id: string
    unit: string
    no_polisi: string | null
    status: string
    tanggal_beli: string | null
    porsi_modal: number
    porsi_pct: number
    bagi_hasil: number | null
    estimasi: boolean
  }[]
  /** Unit yang didanai investor ini dan sedang berstatus PERBAIKAN, lengkap rincian pengerjaannya. */
  unitPerbaikan: {
    car_id: string
    unit: string
    no_polisi: string | null
    hari_di_bengkel: number
    perbaikan: {
      id: string
      jenis_perbaikan: string
      deskripsi: string | null
      vendor_nama: string
      biaya: number
      status: string
      tanggal_masuk: string
      tanggal_selesai: string | null
    }[]
  }[]
  trend: { bulan: string; unit: number; nilai: number }[]
  waterfall: BarisWaterfall[]
}

const KOSONG: DashboardInvestor = {
  nama: '',
  nisbahPct: null,
  saldo: 0,
  totalInvestasi: 0,
  totalBagiHasil: 0,
  totalPenarikan: 0,
  modalBerjalan: 0,
  unitBerjalan: 0,
  unitTerjual: 0,
  punyaAkadAktif: false,
  ledger: [],
  unitDidanai: [],
  unitPerbaikan: [],
  trend: [],
  waterfall: [],
}

/**
 * Semua data dashboard investor — hanya milik investor tersebut.
 * Bahasa keterangan sengaja awam (lihat PRD 04 bagian 3).
 */
export async function getDashboardInvestor(investorId: string) {
  return aman<DashboardInvestor>(async (db) => {
    const [inv, bal, kontrak, ledger, fundings] = await Promise.all([
      db.from('investors').select('nama').eq('id', investorId).maybeSingle(),
      db.from('v_investor_balance').select('*').eq('investor_id', investorId).maybeSingle(),
      db
        .from('investor_contracts')
        .select('status, nisbah_investor_pct, tanggal_akad')
        .eq('investor_id', investorId)
        .eq('status', 'AKTIF')
        .order('tanggal_akad', { ascending: false }),
      db
        .from('investor_ledger')
        .select('*')
        .eq('investor_id', investorId)
        .order('tanggal', { ascending: true })
        .order('created_at', { ascending: true }),
      db
        .from('car_fundings')
        .select('*, cars(merek, tipe, tahun, no_polisi, status)')
        .eq('investor_id', investorId),
    ])

    if (inv.error) throw new Error(inv.error.message)

    const carIds = ((fundings.data ?? []) as any[]).map((f) => f.car_id)

    const [purchases, details, repairs] = await Promise.all([
      carIds.length
        ? db.from('purchases').select('car_id, tanggal_beli').in('car_id', carIds)
        : Promise.resolve({ data: [] as any[] }),
      carIds.length
        ? db
            .from('profit_sharing_details')
            .select('bagi_hasil, profit_sharings(car_id, tanggal_proses, is_reversed)')
            .eq('investor_id', investorId)
        : Promise.resolve({ data: [] as any[] }),
      carIds.length
        ? db
            .from('repairs')
            .select('*, vendors(nama)')
            .in('car_id', carIds)
            .order('tanggal_masuk', { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
    ])

    const tglBeli = new Map<string, string>()
    for (const p of ((purchases.data ?? []) as any[])) tglBeli.set(p.car_id, p.tanggal_beli)

    const bagiPerCar = new Map<string, number>()
    for (const d of ((details.data ?? []) as any[])) {
      const ps = d.profit_sharings
      if (!ps || ps.is_reversed) continue
      bagiPerCar.set(ps.car_id, (bagiPerCar.get(ps.car_id) ?? 0) + num(d.bagi_hasil))
    }

    const unitDidanai = ((fundings.data ?? []) as any[])
      .map((f) => ({
        car_id: f.car_id as string,
        unit: f.cars ? `${f.cars.merek} ${f.cars.tipe} ${f.cars.tahun}` : '-',
        no_polisi: f.cars?.no_polisi ?? null,
        status: f.cars?.status ?? 'DIBELI',
        tanggal_beli: tglBeli.get(f.car_id) ?? null,
        porsi_modal: num(f.amount),
        porsi_pct: num(f.porsi_pct),
        bagi_hasil: bagiPerCar.has(f.car_id) ? bagiPerCar.get(f.car_id)! : null,
        estimasi: !bagiPerCar.has(f.car_id),
      }))
      .sort((a, z) => (z.tanggal_beli ?? '').localeCompare(a.tanggal_beli ?? ''))

    // Progres perbaikan untuk unit yang statusnya sedang PERBAIKAN — supaya
    // investor tahu unitnya sedang dikerjakan apa, bukan cuma badge status.
    const repairPerCar = new Map<string, any[]>()
    for (const r of ((repairs.data ?? []) as any[])) {
      const cur = repairPerCar.get(r.car_id) ?? []
      cur.push(r)
      repairPerCar.set(r.car_id, cur)
    }
    const unitPerbaikan = unitDidanai
      .filter((u) => u.status === 'PERBAIKAN')
      .map((u) => {
        // repairs sudah diurutkan tanggal_masuk terbaru dulu (lihat query di atas).
        const list = repairPerCar.get(u.car_id) ?? []
        const aktif = list.find((r) => r.status === 'PROSES') ?? list[0]
        return {
          car_id: u.car_id,
          unit: u.unit,
          no_polisi: u.no_polisi,
          hari_di_bengkel: umurHari(aktif?.tanggal_masuk ?? u.tanggal_beli) ?? 0,
          perbaikan: list.map((r) => ({
            id: r.id as string,
            jenis_perbaikan: r.jenis_perbaikan as string,
            deskripsi: r.deskripsi as string | null,
            vendor_nama: r.vendors?.nama ?? 'Tanpa vendor',
            biaya: num(r.biaya),
            status: r.status as string,
            tanggal_masuk: r.tanggal_masuk as string,
            tanggal_selesai: r.tanggal_selesai as string | null,
          })),
        }
      })

    const rows = ((ledger.data ?? []) as any[]).map((l) => ({
      ...l,
      amount: num(l.amount),
    })) as InvestorLedger[]

    // Trend bulanan: unit yang didanai & sudah dibagi hasil + bagi hasil diterima
    const perBulan = new Map<string, { unit: number; nilai: number }>()
    for (const d of ((details.data ?? []) as any[])) {
      const ps = d.profit_sharings
      if (!ps || ps.is_reversed) continue
      const key = String(ps.tanggal_proses).slice(0, 7)
      const cur = perBulan.get(key) ?? { unit: 0, nilai: 0 }
      cur.unit += 1
      cur.nilai += num(d.bagi_hasil)
      perBulan.set(key, cur)
    }
    const trend = Array.from(perBulan.entries())
      .sort((a, z) => a[0].localeCompare(z[0]))
      .slice(-12)
      .map(([bulan, v]) => ({ bulan: formatBulan(`${bulan}-01`), unit: v.unit, nilai: v.nilai }))

    const b = (bal.data ?? {}) as any
    const saldo = num(b.saldo)
    const totalInvestasi = num(b.total_investasi)
    const totalBagiHasil = num(b.total_bagi_hasil)
    const totalPenarikan = num(b.total_penarikan)
    const k = ((kontrak.data ?? []) as any[])[0]

    return {
      nama: (inv.data as any)?.nama ?? '',
      nisbahPct: k ? num(k.nisbah_investor_pct) : null,
      saldo,
      totalInvestasi,
      totalBagiHasil,
      totalPenarikan,
      modalBerjalan: num(b.modal_berjalan),
      unitBerjalan: unitDidanai.filter((u) => u.status !== 'SELESAI').length,
      unitTerjual: unitDidanai.filter((u) => u.status === 'TERJUAL' || u.status === 'SELESAI')
        .length,
      punyaAkadAktif: ((kontrak.data ?? []) as any[]).length > 0,
      ledger: rows,
      unitDidanai,
      unitPerbaikan,
      trend,
      waterfall: susunWaterfallInvestor({
        totalSetoran: totalInvestasi,
        totalBagiHasil,
        totalPenarikan,
        saldo,
      }),
    }
  }, KOSONG)
}

export type DetailUnitInvestor = {
  car: CarOverview | null
  funding: { amount: number; porsi_pct: number; nisbah_investor_pct: number } | null
  purchase: { tanggal_beli: string; harga_beli: number; rincian_biaya_lain: any[] } | null
  repairs: {
    id: string
    jenis_perbaikan: string
    deskripsi: string | null
    biaya: number
    tanggal_masuk: string
    tanggal_selesai: string | null
    status: string
    vendor_nama: string | null
  }[]
  sale: {
    no_transaksi: string
    tanggal_jual: string
    harga_jual: number
    hpp_snapshot: number
    laba_kotor: number
    laba_bersih: number
    komisi_sales: number
    biaya_lain: number
  } | null
  booking: {
    no_booking: string
    tanggal_booking: string
    harga_sepakat: number
    dp_amount: number
  } | null
  profitSharingDetail: {
    tanggal_proses: string
    modal_awal: number
    porsi_pct: number
    bagi_hasil: number
    modal_kembali: number
    total_kembali: number
    sudah_ditransfer: boolean
  } | null
}

const DETAIL_UNIT_KOSONG: DetailUnitInvestor = {
  car: null,
  funding: null,
  purchase: null,
  repairs: [],
  sale: null,
  booking: null,
  profitSharingDetail: null,
}

/**
 * Detail SATU unit khusus buat investor — versi "cuma baca" dari halaman
 * detail mobil punya admin. Sengaja tidak pernah menyebut investor lain
 * (nama/nominal pendana lain) meskipun unitnya urun dana bareng — investor
 * cuma boleh lihat porsi modal & bagi hasil miliknya sendiri.
 *
 * `funding` yang null berarti investor ini BUKAN pendana unit tsb — caller
 * wajib redirect/notFound, jangan pernah menampilkan `car` dalam kondisi ini
 * (itu jalan bocor lihat unit investor lain lewat tebak-tebak ID).
 */
export async function getDetailUnitInvestor(carId: string, investorId: string) {
  return aman<DetailUnitInvestor>(async (db) => {
    const funding = await db
      .from('car_fundings')
      .select('amount, porsi_pct, nisbah_investor_pct')
      .eq('car_id', carId)
      .eq('investor_id', investorId)
      .maybeSingle()
    if (funding.error) throw new Error(funding.error.message)
    if (!funding.data) return DETAIL_UNIT_KOSONG

    const [car, purchase, repairs, sale, booking] = await Promise.all([
      db.from('v_car_overview').select('*').eq('id', carId).maybeSingle(),
      db.from('purchases').select('tanggal_beli, harga_beli, rincian_biaya_lain').eq('car_id', carId).maybeSingle(),
      db
        .from('repairs')
        .select('id, jenis_perbaikan, deskripsi, biaya, tanggal_masuk, tanggal_selesai, status, vendors(nama)')
        .eq('car_id', carId)
        .order('tanggal_masuk', { ascending: true }),
      db
        .from('car_sales')
        .select('no_transaksi, tanggal_jual, harga_jual, hpp_snapshot, laba_kotor, laba_bersih, komisi_sales, biaya_lain, id')
        .eq('car_id', carId)
        .maybeSingle(),
      db
        .from('bookings')
        .select('no_booking, tanggal_booking, harga_sepakat, dp_amount')
        .eq('car_id', carId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    if (car.error) throw new Error(car.error.message)

    let profitSharingDetail: DetailUnitInvestor['profitSharingDetail'] = null
    if (sale.data?.id) {
      const ps = await db
        .from('profit_sharings')
        .select('id, tanggal_proses, is_reversed')
        .eq('car_sale_id', sale.data.id)
        .maybeSingle()
      if (ps.data && !ps.data.is_reversed) {
        const psd = await db
          .from('profit_sharing_details')
          .select('modal_awal, porsi_pct, bagi_hasil, modal_kembali, total_kembali, sudah_ditransfer')
          .eq('profit_sharing_id', ps.data.id)
          .eq('investor_id', investorId)
          .maybeSingle()
        if (psd.data) {
          profitSharingDetail = {
            tanggal_proses: ps.data.tanggal_proses,
            modal_awal: num(psd.data.modal_awal),
            porsi_pct: num(psd.data.porsi_pct),
            bagi_hasil: num(psd.data.bagi_hasil),
            modal_kembali: num(psd.data.modal_kembali),
            total_kembali: num(psd.data.total_kembali),
            sudah_ditransfer: Boolean(psd.data.sudah_ditransfer),
          }
        }
      }
    }

    return {
      car: car.data ? normalisasiCar(car.data) : null,
      funding: {
        amount: num(funding.data.amount),
        porsi_pct: num(funding.data.porsi_pct),
        nisbah_investor_pct: num(funding.data.nisbah_investor_pct),
      },
      purchase: purchase.data
        ? {
            tanggal_beli: purchase.data.tanggal_beli,
            harga_beli: num(purchase.data.harga_beli),
            rincian_biaya_lain: (purchase.data.rincian_biaya_lain as any[]) ?? [],
          }
        : null,
      repairs: ((repairs.data ?? []) as any[]).map((r) => ({
        id: r.id,
        jenis_perbaikan: r.jenis_perbaikan,
        deskripsi: r.deskripsi,
        biaya: num(r.biaya),
        tanggal_masuk: r.tanggal_masuk,
        tanggal_selesai: r.tanggal_selesai,
        status: r.status,
        vendor_nama: r.vendors?.nama ?? null,
      })),
      sale: sale.data
        ? {
            no_transaksi: sale.data.no_transaksi,
            tanggal_jual: sale.data.tanggal_jual,
            harga_jual: num(sale.data.harga_jual),
            hpp_snapshot: num(sale.data.hpp_snapshot),
            laba_kotor: num(sale.data.laba_kotor),
            laba_bersih: num(sale.data.laba_bersih),
            komisi_sales: num(sale.data.komisi_sales),
            biaya_lain: num(sale.data.biaya_lain),
          }
        : null,
      booking: booking.data
        ? {
            no_booking: booking.data.no_booking,
            tanggal_booking: booking.data.tanggal_booking,
            harga_sepakat: num(booking.data.harga_sepakat),
            dp_amount: num(booking.data.dp_amount),
          }
        : null,
      profitSharingDetail,
    }
  }, DETAIL_UNIT_KOSONG)
}
