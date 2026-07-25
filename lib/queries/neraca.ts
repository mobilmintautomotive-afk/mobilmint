import 'server-only'
import { aman, num } from './base'
import { todayJakarta } from '@/lib/format'

export type NeracaPengelola = {
  perTanggal: string
  /* Aset */
  kasPengelola: number
  asetTetapNilaiBuku: number
  totalAset: number
  /* Modal */
  modalDisetor: number
  labaDitahan: number
  prive: number
  totalModal: number
  /* Rincian pembentuk laba ditahan */
  porsiBagiHasil: number
  totalOpex: number
  akumulasiPenyusutan: number
  rincianAset: {
    id: string
    nama: string
    kategori: string
    tanggal_beli: string
    harga_beli: number
    akumulasi_penyusutan: number
    nilai_buku: number
  }[]
}

const KOSONG: NeracaPengelola = {
  perTanggal: '',
  kasPengelola: 0,
  asetTetapNilaiBuku: 0,
  totalAset: 0,
  modalDisetor: 0,
  labaDitahan: 0,
  prive: 0,
  totalModal: 0,
  porsiBagiHasil: 0,
  totalOpex: 0,
  akumulasiPenyusutan: 0,
  rincianAset: [],
}

/**
 * Neraca Pengelola — posisi keuangan pengelola SAJA, terpisah dari dana
 * investor. Dana investor punya neracanya sendiri per investor.
 *
 * Kenapa kasnya dihitung, bukan diambil dari saldo rekening:
 * satu rekening bank menampung uang investor DAN uang pengelola sekaligus,
 * jadi saldo rekening bukan milik pengelola seluruhnya. Yang benar-benar
 * hak pengelola = modal yang ia setor + bagian labanya, dikurangi beban
 * yang ia tanggung (operasional & pembelian aset) dan yang sudah ia tarik.
 *
 * Identitas neraca terjaga karena pembelian aset mengurangi kas tapi
 * menambah aset tetap dengan nilai yang sama; yang menggerus modal cuma
 * penyusutannya.
 *
 *   Aset  = Kas Pengelola + Aset Tetap (nilai buku)
 *   Modal = Modal Disetor + Laba Ditahan - Prive
 *   Laba Ditahan = Porsi Bagi Hasil - Biaya Operasional - Penyusutan
 */
export async function getNeracaPengelola() {
  return aman<NeracaPengelola>(async (db) => {
    const [hak, aset] = await Promise.all([
      db.from('v_hak_pengelola').select('*').single(),
      db.from('v_asset_book_value').select('*').neq('status', 'DIHAPUS'),
    ])
    if (hak.error) throw new Error(hak.error.message)
    if (aset.error) throw new Error(aset.error.message)

    const h = hak.data as any
    const modalDisetor = num(h.modal_disetor)
    const porsiBagiHasil = num(h.porsi_bagi_hasil)
    const totalOpex = num(h.biaya_operasional)
    const belanjaAset = num(h.pembelian_aset)
    const prive = num(h.sudah_dicairkan)

    const rincianAset = ((aset.data ?? []) as any[]).map((a) => ({
      id: a.id as string,
      nama: a.nama as string,
      kategori: a.kategori as string,
      tanggal_beli: a.tanggal_beli as string,
      harga_beli: num(a.harga_beli),
      akumulasi_penyusutan: num(a.akumulasi_penyusutan),
      nilai_buku: num(a.nilai_buku),
    }))

    const asetTetapNilaiBuku = rincianAset.reduce((s, a) => s + a.nilai_buku, 0)
    const akumulasiPenyusutan = rincianAset.reduce((s, a) => s + a.akumulasi_penyusutan, 0)

    const kasPengelola = modalDisetor + porsiBagiHasil - totalOpex - belanjaAset - prive
    const labaDitahan = porsiBagiHasil - totalOpex - akumulasiPenyusutan

    return {
      perTanggal: todayJakarta(),
      kasPengelola,
      asetTetapNilaiBuku,
      totalAset: kasPengelola + asetTetapNilaiBuku,
      modalDisetor,
      labaDitahan,
      prive,
      totalModal: modalDisetor + labaDitahan - prive,
      porsiBagiHasil,
      totalOpex,
      akumulasiPenyusutan,
      rincianAset,
    }
  }, KOSONG)
}
