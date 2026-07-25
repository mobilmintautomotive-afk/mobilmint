import 'server-only'
import { aman, unwrap, num, LIST_LIMIT } from './base'
import type { CarOverview } from '@/types/database'

/* -------------------------------- Akad ------------------------------- */

export async function getDaftarAkad() {
  return aman(async (db) => {
    const rows = unwrap(
      await db
        .from('investor_contracts')
        .select('*, investors(nama), investment_tiers(nama_golongan)')
        .order('tanggal_akad', { ascending: false })
        .range(0, LIST_LIMIT - 1),
    ) as any[]
    return rows.map((r) => ({
      ...r,
      nilai_investasi: num(r.nilai_investasi),
      nisbah_investor_pct: num(r.nisbah_investor_pct),
      nisbah_pengelola_pct: num(r.nisbah_pengelola_pct),
      jumlah_diterima: r.jumlah_diterima == null ? null : num(r.jumlah_diterima),
      investor_nama: r.investors?.nama ?? '-',
      golongan: r.investment_tiers?.nama_golongan ?? '-',
    }))
  }, [] as any[])
}

/* ------------------------------ Pembelian ---------------------------- */

export async function getDaftarPembelian() {
  return aman(async (db) => {
    const rows = unwrap(
      await db
        .from('purchases')
        .select(
          '*, cars(merek, tipe, tahun, no_polisi, status), suppliers(nama, tipe_supplier)',
        )
        .order('tanggal_beli', { ascending: false })
        .range(0, LIST_LIMIT - 1),
    ) as any[]
    return rows.map((r) => ({
      ...r,
      harga_beli: num(r.harga_beli),
      biaya_lain: num(r.biaya_lain),
      total_modal: num(r.total_modal),
      unit: r.cars ? `${r.cars.merek} ${r.cars.tipe} ${r.cars.tahun}` : '-',
      no_polisi: r.cars?.no_polisi ?? null,
      status_unit: r.cars?.status ?? null,
      supplier_nama: r.suppliers?.nama ?? '-',
    }))
  }, [] as any[])
}

/** Unit yang belum punya transaksi pembelian — kandidat form pembelian. */
export async function getUnitBelumDibeli() {
  return aman(async (db) => {
    const [cars, purchases] = await Promise.all([
      db.from('cars').select('id, merek, tipe, tahun, no_polisi, status').order('created_at', { ascending: false }),
      db.from('purchases').select('car_id'),
    ])
    if (cars.error) throw new Error(cars.error.message)
    const sudah = new Set(((purchases.data ?? []) as any[]).map((p) => p.car_id))
    return ((cars.data ?? []) as any[]).filter((c) => !sudah.has(c.id))
  }, [] as any[])
}

/* ------------------------------ Perbaikan ---------------------------- */

export async function getDaftarPerbaikan() {
  return aman(async (db) => {
    const rows = unwrap(
      await db
        .from('repairs')
        .select('*, cars(merek, tipe, tahun, no_polisi, status), vendors(nama, tipe_vendor)')
        .order('tanggal_masuk', { ascending: false })
        .range(0, LIST_LIMIT - 1),
    ) as any[]
    return rows.map((r) => ({
      ...r,
      biaya: num(r.biaya),
      unit: r.cars ? `${r.cars.merek} ${r.cars.tipe} ${r.cars.tahun}` : '-',
      status_unit: r.cars?.status ?? null,
      vendor_nama: r.vendors?.nama ?? '-',
    }))
  }, [] as any[])
}

/** Unit yang boleh diperbaiki: sudah dibeli & belum terjual. */
export async function getUnitBisaDiperbaiki() {
  return aman<CarOverview[]>(async (db) => {
    const rows = unwrap(
      await db
        .from('v_car_overview')
        .select('*')
        .in('status', ['DIBELI', 'PERBAIKAN', 'READY_STOCK'])
        .order('created_at', { ascending: false }),
    ) as any[]
    return rows.map((r) => ({ ...r, hpp: num(r.hpp) }))
  }, [])
}

/* -------------------------------- Stock ------------------------------ */

export async function getReadyStock() {
  return aman<CarOverview[]>(async (db) => {
    const rows = unwrap(
      await db
        .from('v_car_overview')
        .select('*')
        .eq('status', 'READY_STOCK')
        .order('tanggal_beli', { ascending: true }),
    ) as any[]
    return rows.map((r) => ({
      ...r,
      hpp: num(r.hpp),
      modal_pembelian: num(r.modal_pembelian),
      total_perbaikan: num(r.total_perbaikan),
      umur_stok_hari: r.umur_stok_hari == null ? null : num(r.umur_stok_hari),
      foto_urls: r.foto_urls ?? [],
    }))
  }, [])
}

/* ------------------------------ Penjualan ---------------------------- */

export async function getDaftarPenjualan() {
  return aman(async (db) => {
    const rows = unwrap(
      await db
        .from('car_sales')
        .select(
          '*, cars(merek, tipe, tahun, no_polisi, status), customers(nama), sales_persons(nama)',
        )
        .order('tanggal_jual', { ascending: false })
        .range(0, LIST_LIMIT - 1),
    ) as any[]
    return rows.map((r) => ({
      ...r,
      harga_jual: num(r.harga_jual),
      komisi_sales: num(r.komisi_sales),
      biaya_lain: num(r.biaya_lain),
      hpp_snapshot: num(r.hpp_snapshot),
      laba_kotor: num(r.laba_kotor),
      laba_bersih: num(r.laba_bersih),
      unit: r.cars ? `${r.cars.merek} ${r.cars.tipe} ${r.cars.tahun}` : '-',
      no_polisi: r.cars?.no_polisi ?? null,
      customer_nama: r.customers?.nama ?? '-',
      sales_nama: r.sales_persons?.nama ?? 'Tanpa sales',
    }))
  }, [] as any[])
}

/**
 * Unit ready stock + HPP + nisbah tertimbang pendananya,
 * dipakai panel kalkulasi live di form penjualan.
 */
export async function getUnitSiapJual() {
  return aman(async (db) => {
    const [cars, fundings] = await Promise.all([
      db.from('v_car_overview').select('*').eq('status', 'READY_STOCK'),
      db.from('car_fundings').select('car_id, amount, nisbah_investor_pct'),
    ])
    if (cars.error) throw new Error(cars.error.message)

    const perUnit = new Map<string, { total: number; bobot: number }>()
    for (const f of ((fundings.data ?? []) as any[])) {
      const cur = perUnit.get(f.car_id) ?? { total: 0, bobot: 0 }
      cur.total += num(f.amount)
      cur.bobot += num(f.amount) * num(f.nisbah_investor_pct)
      perUnit.set(f.car_id, cur)
    }

    return ((cars.data ?? []) as any[]).map((c) => {
      const f = perUnit.get(c.id)
      return {
        id: c.id as string,
        label: `${c.merek} ${c.tipe} ${c.tahun}`,
        no_polisi: c.no_polisi as string | null,
        hpp: num(c.hpp),
        modal_pembelian: num(c.modal_pembelian),
        total_perbaikan: num(c.total_perbaikan),
        total_modal_investor: f?.total ?? 0,
        nisbah_investor_pct: f && f.total > 0 ? Number((f.bobot / f.total).toFixed(2)) : 0,
      }
    })
  }, [] as any[])
}

/* ----------------------------- Bagi Hasil ---------------------------- */

/** Tab 1 — unit TERJUAL yang belum dibagi hasil, lengkap dengan simulasinya. */
export async function getMenungguBagiHasil() {
  return aman(async (db) => {
    const sales = unwrap(
      await db
        .from('car_sales')
        .select('*, cars(merek, tipe, tahun, no_polisi, status)')
        .eq('is_profit_shared', false)
        .order('tanggal_jual', { ascending: true }),
    ) as any[]

    if (sales.length === 0) return []

    const carIds = sales.map((s) => s.car_id)
    const fundings = unwrap(
      await db
        .from('car_fundings')
        .select('car_id, investor_id, amount, nisbah_investor_pct, investors(nama)')
        .in('car_id', carIds),
    ) as any[]

    const perUnit = new Map<string, any[]>()
    for (const f of fundings) {
      if (!perUnit.has(f.car_id)) perUnit.set(f.car_id, [])
      perUnit.get(f.car_id)!.push({
        investor_id: f.investor_id,
        nama: f.investors?.nama ?? '-',
        amount: num(f.amount),
        nisbah_investor_pct: num(f.nisbah_investor_pct),
      })
    }

    return sales.map((s) => ({
      id: s.id as string,
      no_transaksi: s.no_transaksi as string,
      car_id: s.car_id as string,
      unit: s.cars ? `${s.cars.merek} ${s.cars.tipe} ${s.cars.tahun}` : '-',
      no_polisi: s.cars?.no_polisi ?? null,
      tanggal_jual: s.tanggal_jual as string,
      harga_jual: num(s.harga_jual),
      hpp_snapshot: num(s.hpp_snapshot),
      laba_bersih: num(s.laba_bersih),
      fundings: perUnit.get(s.car_id) ?? [],
    }))
  }, [] as any[])
}

/** Tab 2 — riwayat bagi hasil yang sudah diproses. */
export async function getRiwayatBagiHasil() {
  return aman(async (db) => {
    const rows = unwrap(
      await db
        .from('profit_sharings')
        .select(
          '*, cars(merek, tipe, tahun, no_polisi), car_sales(no_transaksi, tanggal_jual), profit_sharing_details(*, investors(nama))',
        )
        .order('tanggal_proses', { ascending: false })
        .range(0, LIST_LIMIT - 1),
    ) as any[]

    return rows.map((r) => ({
      ...r,
      laba_bersih: num(r.laba_bersih),
      porsi_investor: num(r.porsi_investor),
      porsi_pengelola: num(r.porsi_pengelola),
      unit: r.cars ? `${r.cars.merek} ${r.cars.tipe} ${r.cars.tahun}` : '-',
      no_polisi: r.cars?.no_polisi ?? null,
      tanggal_jual: r.car_sales?.tanggal_jual ?? null,
      details: ((r.profit_sharing_details ?? []) as any[])
        .map((d) => ({
          ...d,
          nama: d.investors?.nama ?? '-',
          modal_awal: num(d.modal_awal),
          bagi_hasil: num(d.bagi_hasil),
          modal_kembali: num(d.modal_kembali),
          total_kembali: num(d.total_kembali),
          porsi_pct: num(d.porsi_pct),
        }))
        .sort((a, z) => z.modal_awal - a.modal_awal),
    }))
  }, [] as any[])
}
