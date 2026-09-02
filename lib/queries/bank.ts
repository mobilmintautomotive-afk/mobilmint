import 'server-only'
import { aman, num, unwrap, LIST_LIMIT } from './base'
import type { CashType } from '@/lib/constants'

export type AkunBank = {
  id: string
  nama: string
  nama_bank: string
  no_rekening: string
  atas_nama: string
  saldo_awal: number
  tanggal_saldo_awal: string
  is_default: boolean
  is_active: boolean
  catatan: string | null
  saldo: number
  total_masuk: number
  total_keluar: number
}

export type MutasiKas = {
  id: string
  bank_account_id: string
  bank_nama: string
  tanggal: string
  tipe: CashType
  amount: number
  keterangan: string
  is_auto: boolean
  ref_table: string | null
  ref_id: string | null
}

/**
 * Posisi uang pengelola sendiri, terpisah dari dana investor.
 * `tersedia` = yang boleh dicairkan ke rekening pribadi.
 */
export type HakPengelola = {
  modalDisetor: number
  porsiBagiHasil: number
  biayaOperasional: number
  pembelianAset: number
  sudahDicairkan: number
  tersedia: number
}

const HAK_KOSONG: HakPengelola = {
  modalDisetor: 0,
  porsiBagiHasil: 0,
  biayaOperasional: 0,
  pembelianAset: 0,
  sudahDicairkan: 0,
  tersedia: 0,
}

export async function getAkunBank() {
  return aman<AkunBank[]>(async (db) => {
    const [saldo, master] = await Promise.all([
      db.from('v_bank_balance').select('*'),
      db.from('bank_accounts').select('id, catatan'),
    ])
    if (saldo.error) throw new Error(saldo.error.message)
    if (master.error) throw new Error(master.error.message)

    const catatan = new Map(
      ((master.data ?? []) as any[]).map((m) => [m.id as string, m.catatan as string | null]),
    )

    return ((saldo.data ?? []) as any[])
      .map((b) => ({
        id: b.bank_account_id as string,
        nama: b.nama as string,
        nama_bank: b.nama_bank as string,
        no_rekening: b.no_rekening as string,
        atas_nama: b.atas_nama as string,
        saldo_awal: num(b.saldo_awal),
        tanggal_saldo_awal: b.tanggal_saldo_awal as string,
        is_default: Boolean(b.is_default),
        is_active: Boolean(b.is_active),
        catatan: catatan.get(b.bank_account_id) ?? null,
        saldo: num(b.saldo),
        total_masuk: num(b.total_masuk),
        total_keluar: num(b.total_keluar),
      }))
      .sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.nama.localeCompare(b.nama))
  }, [])
}

export async function getMutasiKas(bankAccountId?: string) {
  return aman<MutasiKas[]>(async (db) => {
    let q = db
      .from('cash_ledger')
      .select('*, bank_accounts(nama)')
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false })
      .range(0, LIST_LIMIT - 1)

    if (bankAccountId) q = q.eq('bank_account_id', bankAccountId)

    const rows = unwrap(await q) as any[]
    return rows.map((r) => ({
      id: r.id as string,
      bank_account_id: r.bank_account_id as string,
      bank_nama: r.bank_accounts?.nama ?? '-',
      tanggal: r.tanggal as string,
      tipe: r.tipe as CashType,
      amount: num(r.amount),
      keterangan: r.keterangan as string,
      is_auto: Boolean(r.is_auto),
      ref_table: (r.ref_table as string | null) ?? null,
      ref_id: (r.ref_id as string | null) ?? null,
    }))
  }, [])
}

export async function getHakPengelola() {
  return aman<HakPengelola>(async (db) => {
    const r = await db.from('v_hak_pengelola').select('*').single()
    if (r.error) throw new Error(r.error.message)
    const h = r.data as any

    const modalDisetor = num(h.modal_disetor)
    const porsiBagiHasil = num(h.porsi_bagi_hasil)
    const biayaOperasional = num(h.biaya_operasional)
    const pembelianAset = num(h.pembelian_aset)
    const sudahDicairkan = num(h.sudah_dicairkan)

    return {
      modalDisetor,
      porsiBagiHasil,
      biayaOperasional,
      pembelianAset,
      sudahDicairkan,
      tersedia:
        modalDisetor + porsiBagiHasil - biayaOperasional - pembelianAset - sudahDicairkan,
    }
  }, HAK_KOSONG)
}
