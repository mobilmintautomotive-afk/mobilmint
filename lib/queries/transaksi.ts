import 'server-only'
import { aman, unwrap, num, LIST_LIMIT } from './base'
import type { CarOverview } from '@/types/database'

/* -------------------------------- Akad ------------------------------- */

export async function getDaftarAkad() {
  return aman(async (db) => {
    const rows = unwrap(
      await db
        .from('investor_contracts')
        .select('*, investors(nama)')
        .order('tanggal_akad', { ascending: false })
        .range(0, LIST_LIMIT - 1),
    ) as any[]
    return rows.map((r) => ({
      ...r,
      nilai_investasi: r.nilai_investasi == null ? null : num(r.nilai_investasi),
      nisbah_investor_pct: num(r.nisbah_investor_pct),
      nisbah_pengelola_pct: num(r.nisbah_pengelola_pct),
      jumlah_diterima: r.jumlah_diterima == null ? null : num(r.jumlah_diterima),
      investor_nama: r.investors?.nama ?? '-',
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

/**
 * Semua unit yang masih jadi stok — bukan cuma yang siap dijual, tapi juga
 * yang baru dibeli dan yang sedang diperbaiki, supaya seluruh barang yang
 * modalnya masih tertanam bisa dipantau di satu halaman.
 *
 * Unit TERJUAL/SELESAI sengaja tidak ikut: modalnya sudah kembali, dan
 * kalau dimasukkan, "nilai modal tertanam" dan "rata-rata umur stok" jadi
 * salah. Riwayat unit terjual ada di Master Mobil & Penjualan.
 */
export async function getStockUnit() {
  return aman<CarOverview[]>(async (db) => {
    const rows = unwrap(
      await db
        .from('v_car_overview')
        .select('*')
        .in('status', ['DIBELI', 'PERBAIKAN', 'READY_STOCK'])
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
 * Unit ready stock + HPP + nisbah pendananya, dipakai panel kalkulasi live
 * di form penjualan.
 *
 * Urun dana dibatasi hanya untuk investor bernisbah sama, jadi satu unit
 * selalu punya satu angka nisbah. Rumus tertimbang di bawah tetap dipakai
 * karena hasilnya sama persis untuk nilai yang seragam, sekaligus jadi
 * pengaman kalau ada baris lama dari sebelum aturan itu berlaku.
 */
export async function getUnitSiapJual() {
  return aman(async (db) => {
    const [cars, fundings] = await Promise.all([
      db.from('v_car_overview').select('*').eq('status', 'READY_STOCK'),
      db.from('car_fundings').select('car_id, amount, nisbah_investor_pct, investors(nama)'),
    ])
    if (cars.error) throw new Error(cars.error.message)

    const perUnit = new Map<string, { total: number; bobot: number; nama: string[] }>()
    for (const f of ((fundings.data ?? []) as any[])) {
      const cur = perUnit.get(f.car_id) ?? { total: 0, bobot: 0, nama: [] }
      cur.total += num(f.amount)
      cur.bobot += num(f.amount) * num(f.nisbah_investor_pct)
      if (f.investors?.nama) cur.nama.push(f.investors.nama as string)
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
        /** Bisa lebih dari satu kalau unit dibiayai urun dana. */
        investor_nama: f?.nama ?? [],
      }
    })
  }, [] as any[])
}

/* ---------------------------- Pencairan Dana --------------------------- */

/**
 * Semua baris bagi hasil per investor per unit (flat), lengkap status
 * pencairannya. Bagi hasil sendiri sudah diproses OTOMATIS saat penjualan
 * disimpan (lihat app/actions/sales.ts) — halaman ini murni soal apakah
 * dananya sudah benar-benar ditransfer ke rekening investor atau belum.
 */
export async function getPencairanDana() {
  return aman(async (db) => {
    const rows = unwrap(
      await db
        .from('profit_sharing_details')
        .select(
          `*, investors(nama),
           profit_sharings!inner(id, no_transaksi, tanggal_proses, is_reversed,
             cars(merek, tipe, tahun, no_polisi),
             car_sales(no_transaksi, tanggal_jual))`,
        )
        .eq('profit_sharings.is_reversed', false)
        .order('tanggal_dicairkan', { ascending: false, nullsFirst: true })
        .range(0, LIST_LIMIT - 1),
    ) as any[]

    return rows.map((d) => {
      const ps = d.profit_sharings
      return {
        id: d.id as string,
        investor_id: d.investor_id as string,
        investor_nama: d.investors?.nama ?? '-',
        modal_awal: num(d.modal_awal),
        porsi_pct: num(d.porsi_pct),
        bagi_hasil: num(d.bagi_hasil),
        sudah_ditransfer: Boolean(d.sudah_ditransfer),
        tanggal_dicairkan: d.tanggal_dicairkan as string | null,
        bukti_transfer_url: d.bukti_transfer_url as string | null,
        no_transaksi_bagi_hasil: ps?.no_transaksi ?? '-',
        no_transaksi_jual: ps?.car_sales?.no_transaksi ?? '-',
        tanggal_jual: ps?.car_sales?.tanggal_jual ?? null,
        tanggal_proses: ps?.tanggal_proses ?? null,
        unit: ps?.cars ? `${ps.cars.merek} ${ps.cars.tipe} ${ps.cars.tahun}` : '-',
        no_polisi: ps?.cars?.no_polisi ?? null,
      }
    })
  }, [] as any[])
}
