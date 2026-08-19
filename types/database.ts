/**
 * Tipe data MobilMint.
 *
 * Ditulis manual mengikuti supabase/migrations. Setelah project Supabase
 * dibuat, file ini bisa diganti hasil:
 *   npx supabase gen types typescript --project-id <ref> > types/database.ts
 * Nama tabel & kolom sengaja sama persis supaya penggantian itu mulus.
 */

export type UserRole = 'admin' | 'holding' | 'investor'
export type CarStatus = 'DIBELI' | 'PERBAIKAN' | 'READY_STOCK' | 'TERJUAL' | 'SELESAI'
export type SupplierType = 'LELANG' | 'MEDIATOR' | 'FOLLOWERS'
export type VendorType = 'BENGKEL' | 'SALON' | 'SPARE_PART' | 'BODY_REPAIR' | 'LAINNYA'
export type ContractStatus = 'MENUNGGU_DANA' | 'AKTIF' | 'SELESAI' | 'BATAL'
export type LedgerType =
  | 'SETORAN'
  | 'ALOKASI_MODAL'
  | 'PENGEMBALIAN_MODAL'
  | 'BAGI_HASIL'
  | 'PENARIKAN'
  | 'PENYESUAIAN'
export type RepairStatus = 'PROSES' | 'SELESAI'
export type PaymentMethod = 'TUNAI' | 'TRANSFER' | 'KREDIT'

export type RincianBiaya = { nama: string; nominal: number }

export interface Investor {
  id: string
  nama: string
  alamat: string | null
  no_tlp: string | null
  email: string | null
  no_ktp: string | null
  nama_bank: string | null
  no_rekening: string | null
  atas_nama_rekening: string | null
  catatan: string | null
  is_active: boolean
  created_at: string
}

export interface Profile {
  id: string
  auth_user_id: string | null
  nama: string
  email: string
  role: UserRole
  investor_id: string | null
  is_active: boolean
  must_change_password: boolean
  last_login_at: string | null
  created_at: string
}

export interface Supplier {
  id: string
  nama: string
  alamat: string | null
  no_tlp: string | null
  tipe_supplier: SupplierType
  catatan: string | null
  is_active: boolean
  created_at: string
}

export interface Vendor {
  id: string
  nama: string
  alamat: string | null
  no_tlp: string | null
  tipe_vendor: VendorType
  catatan: string | null
  is_active: boolean
  created_at: string
}

export interface SalesPerson {
  id: string
  nama: string
  alamat: string | null
  no_tlp: string | null
  komisi_default: number
  is_active: boolean
  created_at: string
}

export interface Customer {
  id: string
  nama: string
  alamat: string | null
  no_tlp: string | null
  no_ktp: string | null
  catatan: string | null
  created_at: string
}

export interface Car {
  id: string
  merek: string
  tipe: string
  tahun: number
  warna: string | null
  no_polisi: string | null
  no_rangka: string | null
  no_mesin: string | null
  transmisi: string | null
  kilometer: number | null
  tanggal_pajak: string | null
  status: CarStatus
  foto_urls: string[] | null
  catatan: string | null
  created_at: string
  updated_at: string
}

/** Baris view `v_car_overview` — car + HPP + jejak pembelian/penjualan. */
export interface CarOverview extends Car {
  modal_pembelian: number
  total_perbaikan: number
  hpp: number
  purchase_id: string | null
  no_pembelian: string | null
  tanggal_beli: string | null
  supplier_id: string | null
  supplier_nama: string | null
  sale_id: string | null
  tanggal_jual: string | null
  harga_jual: number | null
  laba_bersih: number | null
  is_profit_shared: boolean | null
  umur_stok_hari: number | null
}

export interface InvestorContract {
  id: string
  no_akad: string
  investor_id: string
  nilai_investasi: number
  nisbah_investor_pct: number
  nisbah_pengelola_pct: number
  tenor_bulan: number | null
  tanggal_akad: string
  tanggal_dana_diterima: string | null
  jumlah_diterima: number | null
  dokumen_url: string | null
  bukti_transfer_url: string | null
  status: ContractStatus
  catatan: string | null
  created_at: string
}

export interface InvestorLedger {
  id: string
  investor_id: string
  contract_id: string | null
  tipe: LedgerType
  amount: number
  keterangan: string
  ref_table: string | null
  ref_id: string | null
  tanggal: string
  created_at: string
}

export interface Purchase {
  id: string
  no_transaksi: string
  car_id: string
  supplier_id: string | null
  tanggal_beli: string
  harga_beli: number
  biaya_lain: number
  rincian_biaya_lain: RincianBiaya[] | null
  total_modal: number
  catatan: string | null
  created_at: string
}

export interface CarFunding {
  id: string
  car_id: string
  purchase_id: string
  investor_id: string
  contract_id: string | null
  amount: number
  porsi_pct: number
  nisbah_investor_pct: number
  created_at: string
}

export interface Repair {
  id: string
  car_id: string
  vendor_id: string | null
  jenis_perbaikan: string
  deskripsi: string | null
  biaya: number
  tanggal_masuk: string
  tanggal_selesai: string | null
  status: RepairStatus
  ambil_dari_modal: boolean
  foto_sebelum: string[] | null
  foto_sesudah: string[] | null
  created_at: string
}

export interface CarSale {
  id: string
  no_transaksi: string
  car_id: string
  customer_id: string | null
  sales_person_id: string | null
  tanggal_jual: string
  harga_jual: number
  komisi_sales: number
  biaya_lain: number
  rincian_biaya_lain: RincianBiaya[] | null
  hpp_snapshot: number
  laba_kotor: number
  laba_bersih: number
  metode_bayar: PaymentMethod
  is_profit_shared: boolean
  catatan: string | null
  created_at: string
}

export interface ProfitSharing {
  id: string
  no_transaksi: string
  car_sale_id: string
  car_id: string
  laba_bersih: number
  porsi_investor: number
  porsi_pengelola: number
  tanggal_proses: string
  is_reversed: boolean
  created_at: string
}

export interface ProfitSharingDetail {
  id: string
  profit_sharing_id: string
  investor_id: string
  modal_awal: number
  porsi_pct: number
  bagi_hasil: number
  modal_kembali: number
  total_kembali: number
  sudah_ditransfer: boolean
}

export interface OperationalExpense {
  id: string
  tanggal: string
  kategori: string
  keterangan: string | null
  nominal: number
  created_at: string
}

export interface AppSettings {
  id: number
  nama_perusahaan: string
  logo_url: string | null
  alamat: string | null
  no_tlp: string | null
  default_nisbah_pengelola: number
  ambang_umur_stok: number
  updated_at: string
}

/** Baris view `v_investor_balance`. */
export interface InvestorBalance {
  investor_id: string
  nama: string
  saldo: number
  total_investasi: number
  total_bagi_hasil: number
  modal_berjalan: number
  total_penarikan: number
}

/** Baris view `v_dashboard_summary`. */
export interface DashboardSummary {
  jumlah_investor: number
  total_investasi: number
  total_saldo: number
  total_unit_terjual: number
  total_unit_available: number
  total_modal_available: number
  total_laba_bersih: number
  total_bagi_hasil: number
}

/** Baris hasil `fn_preview_allocation`. */
export interface AllocationPreviewRow {
  investor_id: string
  nama: string
  saldo: number
  porsi_pct: number
  amount: number
}
