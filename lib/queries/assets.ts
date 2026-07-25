import 'server-only'
import { aman, num, LIST_LIMIT } from './base'

export type Aset = {
  id: string
  nama: string
  kategori: string
  tanggal_beli: string
  harga_beli: number
  umur_manfaat_bulan: number | null
  nilai_residu: number
  status: string
  catatan: string | null
  akumulasi_penyusutan: number
  nilai_buku: number
  created_at: string
}

export async function getDaftarAset() {
  return aman<Aset[]>(async (db) => {
    const r = await db
      .from('v_asset_book_value')
      .select('*')
      .order('tanggal_beli', { ascending: false })
      .range(0, LIST_LIMIT - 1)
    if (r.error) throw new Error(r.error.message)
    return ((r.data ?? []) as any[]).map((a) => ({
      ...a,
      harga_beli: num(a.harga_beli),
      nilai_residu: num(a.nilai_residu),
      akumulasi_penyusutan: num(a.akumulasi_penyusutan),
      nilai_buku: num(a.nilai_buku),
    }))
  }, [])
}
