import 'server-only'
import { aman, num } from './base'
import { formatBulan } from '@/lib/format'
import { susunWaterfallInvestor, type BarisWaterfall } from '@/lib/calc'
import type { InvestorLedger } from '@/types/database'

export type DashboardInvestor = {
  nama: string
  golongan: string | null
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
  trend: { bulan: string; unit: number; nilai: number }[]
  waterfall: BarisWaterfall[]
}

const KOSONG: DashboardInvestor = {
  nama: '',
  golongan: null,
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
        .select('status, nisbah_investor_pct, tanggal_akad, investment_tiers(nama_golongan)')
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

    const [purchases, details] = await Promise.all([
      carIds.length
        ? db.from('purchases').select('car_id, tanggal_beli').in('car_id', carIds)
        : Promise.resolve({ data: [] as any[] }),
      carIds.length
        ? db
            .from('profit_sharing_details')
            .select('bagi_hasil, profit_sharings(car_id, tanggal_proses, is_reversed)')
            .eq('investor_id', investorId)
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
      golongan: k?.investment_tiers?.nama_golongan ?? null,
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
