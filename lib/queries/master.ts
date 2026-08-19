import 'server-only'
import { aman, unwrap, num, countBy, sumBy, LIST_LIMIT } from './base'
import type {
  CarOverview,
  Customer,
  Investor,
  InvestorBalance,
  SalesPerson,
  Supplier,
  Vendor,
} from '@/types/database'

/* ------------------------------- Mobil ------------------------------- */

export async function getDaftarMobil() {
  return aman<CarOverview[]>(async (db) => {
    const rows = unwrap(
      await db
        .from('v_car_overview')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, LIST_LIMIT - 1),
    ) as any[]
    return rows.map(normalisasiCar)
  }, [])
}

export async function getMobil(id: string) {
  return aman<CarOverview | null>(async (db) => {
    const res = await db.from('v_car_overview').select('*').eq('id', id).maybeSingle()
    if (res.error) throw new Error(res.error.message)
    return res.data ? normalisasiCar(res.data) : null
  }, null)
}

/** Detail lengkap satu unit: HPP breakdown, pendana, perbaikan, penjualan. */
export async function getDetailMobil(id: string) {
  return aman(
    async (db) => {
      const [car, purchase, repairs, fundings, sale] = await Promise.all([
        db.from('v_car_overview').select('*').eq('id', id).maybeSingle(),
        db.from('purchases').select('*, suppliers(nama, tipe_supplier)').eq('car_id', id).maybeSingle(),
        db
          .from('repairs')
          .select('*, vendors(nama, tipe_vendor)')
          .eq('car_id', id)
          .order('tanggal_masuk', { ascending: true }),
        db
          .from('car_fundings')
          .select('*, investors(nama)')
          .eq('car_id', id)
          .order('amount', { ascending: false }),
        db
          .from('car_sales')
          .select('*, customers(nama), sales_persons(nama)')
          .eq('car_id', id)
          .maybeSingle(),
      ])

      if (car.error) throw new Error(car.error.message)

      let profitSharing: any = null
      if (sale.data?.id) {
        const ps = await db
          .from('profit_sharings')
          .select('*, profit_sharing_details(*, investors(nama))')
          .eq('car_sale_id', sale.data.id)
          .maybeSingle()
        profitSharing = ps.data ?? null
      }

      return {
        car: car.data ? normalisasiCar(car.data) : null,
        purchase: purchase.data ?? null,
        repairs: (repairs.data ?? []) as any[],
        fundings: (fundings.data ?? []) as any[],
        sale: sale.data ?? null,
        profitSharing,
      }
    },
    { car: null as CarOverview | null, purchase: null as any, repairs: [] as any[], fundings: [] as any[], sale: null as any, profitSharing: null as any },
  )
}

function normalisasiCar(r: any): CarOverview {
  return {
    ...r,
    modal_pembelian: num(r.modal_pembelian),
    total_perbaikan: num(r.total_perbaikan),
    hpp: num(r.hpp),
    harga_jual: r.harga_jual == null ? null : num(r.harga_jual),
    laba_bersih: r.laba_bersih == null ? null : num(r.laba_bersih),
    umur_stok_hari: r.umur_stok_hari == null ? null : num(r.umur_stok_hari),
    foto_urls: r.foto_urls ?? [],
  }
}

/* ------------------------------ Investor ----------------------------- */

export type BarisInvestor = Investor & {
  saldo: number
  total_investasi: number
  total_bagi_hasil: number
  modal_berjalan: number
  nisbah_aktif: number | null
}

export async function getDaftarInvestor() {
  return aman<BarisInvestor[]>(async (db) => {
    const [inv, bal, kontrak] = await Promise.all([
      db.from('investors').select('*').order('nama').range(0, LIST_LIMIT - 1),
      db.from('v_investor_balance').select('*'),
      db
        .from('investor_contracts')
        .select('investor_id, nisbah_investor_pct, tanggal_akad, status')
        .eq('status', 'AKTIF')
        .order('tanggal_akad', { ascending: false }),
    ])
    if (inv.error) throw new Error(inv.error.message)

    const saldoMap = new Map<string, InvestorBalance>()
    for (const b of (bal.data ?? []) as any[]) {
      saldoMap.set(b.investor_id, {
        investor_id: b.investor_id,
        nama: b.nama,
        saldo: num(b.saldo),
        total_investasi: num(b.total_investasi),
        total_bagi_hasil: num(b.total_bagi_hasil),
        modal_berjalan: num(b.modal_berjalan),
        total_penarikan: num(b.total_penarikan),
      })
    }

    // Akad aktif terbaru per investor — kesepakatan yang sedang berlaku.
    const nisbahMap = new Map<string, number>()
    for (const k of (kontrak.data ?? []) as any[]) {
      if (!nisbahMap.has(k.investor_id)) nisbahMap.set(k.investor_id, num(k.nisbah_investor_pct))
    }

    return (inv.data as Investor[]).map((i) => {
      const b = saldoMap.get(i.id)
      return {
        ...i,
        saldo: b?.saldo ?? 0,
        total_investasi: b?.total_investasi ?? 0,
        total_bagi_hasil: b?.total_bagi_hasil ?? 0,
        modal_berjalan: b?.modal_berjalan ?? 0,
        nisbah_aktif: nisbahMap.get(i.id) ?? null,
      }
    })
  }, [])
}

/** Investor + saldo + nisbah aktif, dipakai dropdown & panel Sumber Dana pembelian. */
export type InvestorPendanaan = InvestorBalance & {
  nisbah_investor_pct: number | null
}

export async function getSaldoInvestor() {
  return aman<InvestorPendanaan[]>(async (db) => {
    const [bal, inv, kontrak] = await Promise.all([
      db.from('v_investor_balance').select('*'),
      db.from('investors').select('id, is_active'),
      db
        .from('investor_contracts')
        .select('investor_id, nisbah_investor_pct, tanggal_akad')
        .eq('status', 'AKTIF')
        .order('tanggal_akad', { ascending: false }),
    ])
    if (bal.error) throw new Error(bal.error.message)
    const aktif = new Set(
      ((inv.data ?? []) as any[]).filter((i) => i.is_active).map((i) => i.id as string),
    )

    // Akad aktif terbaru per investor — nisbah yang dipakai server saat
    // allocate_purchase_funding menyimpan snapshot (lihat migration 000200).
    const nisbahMap = new Map<string, number>()
    for (const k of (kontrak.data ?? []) as any[]) {
      if (!nisbahMap.has(k.investor_id)) nisbahMap.set(k.investor_id, num(k.nisbah_investor_pct))
    }

    return ((bal.data ?? []) as any[])
      .filter((b) => aktif.has(b.investor_id))
      .map((b) => ({
        investor_id: b.investor_id,
        nama: b.nama,
        saldo: num(b.saldo),
        total_investasi: num(b.total_investasi),
        total_bagi_hasil: num(b.total_bagi_hasil),
        modal_berjalan: num(b.modal_berjalan),
        total_penarikan: num(b.total_penarikan),
        nisbah_investor_pct: nisbahMap.get(b.investor_id) ?? null,
      }))
      .sort((a, z) => z.saldo - a.saldo)
  }, [])
}

export async function getDetailInvestor(id: string) {
  return aman(
    async (db) => {
      const [inv, bal, kontrak, ledger, fundings] = await Promise.all([
        db.from('investors').select('*').eq('id', id).maybeSingle(),
        db.from('v_investor_balance').select('*').eq('investor_id', id).maybeSingle(),
        db
          .from('investor_contracts')
          .select('*')
          .eq('investor_id', id)
          .order('tanggal_akad', { ascending: false }),
        db
          .from('investor_ledger')
          .select('*')
          .eq('investor_id', id)
          .order('tanggal', { ascending: true })
          .order('created_at', { ascending: true }),
        db
          .from('car_fundings')
          .select('*, cars(merek, tipe, tahun, no_polisi, status)')
          .eq('investor_id', id)
          .order('created_at', { ascending: false }),
      ])
      if (inv.error) throw new Error(inv.error.message)

      return {
        investor: (inv.data ?? null) as Investor | null,
        saldo: bal.data
          ? {
              investor_id: id,
              nama: (bal.data as any).nama,
              saldo: num((bal.data as any).saldo),
              total_investasi: num((bal.data as any).total_investasi),
              total_bagi_hasil: num((bal.data as any).total_bagi_hasil),
              modal_berjalan: num((bal.data as any).modal_berjalan),
              total_penarikan: num((bal.data as any).total_penarikan),
            }
          : null,
        kontrak: (kontrak.data ?? []) as any[],
        ledger: (ledger.data ?? []).map((l: any) => ({ ...l, amount: num(l.amount) })),
        fundings: (fundings.data ?? []).map((f: any) => ({ ...f, amount: num(f.amount) })),
      }
    },
    {
      investor: null as Investor | null,
      saldo: null as InvestorBalance | null,
      kontrak: [] as any[],
      ledger: [] as any[],
      fundings: [] as any[],
    },
  )
}

/* -------------------- Customer / Sales / Supplier / Vendor -------------------- */

export type BarisCustomer = Customer & { jumlah_pembelian: number }

export async function getDaftarCustomer() {
  return aman<BarisCustomer[]>(async (db) => {
    const [cust, sales] = await Promise.all([
      db.from('customers').select('*').order('nama').range(0, LIST_LIMIT - 1),
      db.from('car_sales').select('customer_id'),
    ])
    if (cust.error) throw new Error(cust.error.message)
    const c = countBy((sales.data ?? []) as any[], (r) => r.customer_id)
    return (cust.data as Customer[]).map((x) => ({ ...x, jumlah_pembelian: c.get(x.id) ?? 0 }))
  }, [])
}

export type BarisSales = SalesPerson & { total_unit: number; total_komisi: number }

export async function getDaftarSales() {
  return aman<BarisSales[]>(async (db) => {
    const [sp, sales] = await Promise.all([
      db.from('sales_persons').select('*').order('nama').range(0, LIST_LIMIT - 1),
      db.from('car_sales').select('sales_person_id, komisi_sales'),
    ])
    if (sp.error) throw new Error(sp.error.message)
    const rows = (sales.data ?? []) as any[]
    const c = countBy(rows, (r) => r.sales_person_id)
    const s = sumBy(rows, (r) => r.sales_person_id, (r) => num(r.komisi_sales))
    return (sp.data as any[]).map((x) => ({
      ...x,
      komisi_default: num(x.komisi_default),
      total_unit: c.get(x.id) ?? 0,
      total_komisi: s.get(x.id) ?? 0,
    }))
  }, [])
}

export type BarisSupplier = Supplier & { jumlah_unit: number; total_nilai: number }

export async function getDaftarSupplier() {
  return aman<BarisSupplier[]>(async (db) => {
    const [sup, beli] = await Promise.all([
      db.from('suppliers').select('*').order('nama').range(0, LIST_LIMIT - 1),
      db.from('purchases').select('supplier_id, total_modal'),
    ])
    if (sup.error) throw new Error(sup.error.message)
    const rows = (beli.data ?? []) as any[]
    const c = countBy(rows, (r) => r.supplier_id)
    const s = sumBy(rows, (r) => r.supplier_id, (r) => num(r.total_modal))
    return (sup.data as Supplier[]).map((x) => ({
      ...x,
      jumlah_unit: c.get(x.id) ?? 0,
      total_nilai: s.get(x.id) ?? 0,
    }))
  }, [])
}

export type BarisVendor = Vendor & { jumlah_perbaikan: number; total_biaya: number }

export async function getDaftarVendor() {
  return aman<BarisVendor[]>(async (db) => {
    const [ven, rep] = await Promise.all([
      db.from('vendors').select('*').order('nama').range(0, LIST_LIMIT - 1),
      db.from('repairs').select('vendor_id, biaya'),
    ])
    if (ven.error) throw new Error(ven.error.message)
    const rows = (rep.data ?? []) as any[]
    const c = countBy(rows, (r) => r.vendor_id)
    const s = sumBy(rows, (r) => r.vendor_id, (r) => num(r.biaya))
    return (ven.data as Vendor[]).map((x) => ({
      ...x,
      jumlah_perbaikan: c.get(x.id) ?? 0,
      total_biaya: s.get(x.id) ?? 0,
    }))
  }, [])
}

/* --------------------------- Opsi dropdown --------------------------- */

export async function getOpsiDropdown() {
  return aman(
    async (db) => {
      const [inv, sup, ven, sls, cus] = await Promise.all([
        db.from('investors').select('id, nama, is_active').eq('is_active', true).order('nama'),
        db.from('suppliers').select('id, nama, tipe_supplier').eq('is_active', true).order('nama'),
        db.from('vendors').select('id, nama, tipe_vendor').eq('is_active', true).order('nama'),
        db.from('sales_persons').select('id, nama, komisi_default').eq('is_active', true).order('nama'),
        db.from('customers').select('id, nama, no_tlp').order('nama'),
      ])
      return {
        investors: (inv.data ?? []) as any[],
        suppliers: (sup.data ?? []) as any[],
        vendors: (ven.data ?? []) as any[],
        sales: ((sls.data ?? []) as any[]).map((s) => ({ ...s, komisi_default: num(s.komisi_default) })),
        customers: (cus.data ?? []) as any[],
      }
    },
    { investors: [], suppliers: [], vendors: [], sales: [], customers: [] } as {
      investors: any[]
      suppliers: any[]
      vendors: any[]
      sales: any[]
      customers: any[]
    },
  )
}

/** Daftar investor ringkas untuk role switcher. */
export async function getInvestorRingkas() {
  const res = await aman<{ id: string; nama: string }[]>(async (db) => {
    const r = await db.from('investors').select('id, nama').eq('is_active', true).order('nama')
    if (r.error) throw new Error(r.error.message)
    return (r.data ?? []) as any[]
  }, [])
  return res.data
}
