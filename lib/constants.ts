export const APP_NAME = 'MobilMint'
export const APP_TAGLINE = 'Manajemen bisnis jual beli mobil berbasis investor'

export const PAGE_SIZE = 20

/** Ambang default umur stok (hari) — bisa dioverride lewat app_settings. */
export const AMBANG_UMUR_STOK = 60

/**
 * Merek mobil umum di pasar Indonesia (baru maupun bekas). Bukan daftar
 * tertutup — form Mobil tetap bisa menambah merek lain lewat fitur
 * "Tambahkan" di dropdown, karena `merek` cuma kolom teks biasa, bukan
 * tabel master tersendiri.
 */
export const MEREK_MOBIL_UMUM = [
  'Toyota',
  'Honda',
  'Daihatsu',
  'Suzuki',
  'Mitsubishi',
  'Nissan',
  'Mazda',
  'Isuzu',
  'Wuling',
  'Hyundai',
  'Kia',
  'Chery',
  'BYD',
  'DFSK',
  'MG',
  'Mercedes-Benz',
  'BMW',
  'Mini',
  'Volvo',
  'Subaru',
  'Ford',
  'Chevrolet',
  'Datsun',
  'Peugeot',
  'Volkswagen',
  'Lexus',
  'Land Rover',
  'Jeep',
  'Renault',
  'Proton',
] as const

export const CAR_STATUS = [
  'DIBELI',
  'PERBAIKAN',
  'READY_STOCK',
  'TERBOOKING',
  'TERJUAL',
  'SELESAI',
] as const
export type CarStatus = (typeof CAR_STATUS)[number]

export const CAR_STATUS_LABEL: Record<CarStatus, string> = {
  DIBELI: 'Dibeli',
  PERBAIKAN: 'Perbaikan',
  READY_STOCK: 'Ready Stock',
  TERBOOKING: 'Terbooking',
  TERJUAL: 'Terjual',
  SELESAI: 'Selesai',
}

export const BOOKING_STATUS = ['AKTIF', 'SELESAI', 'BATAL'] as const
export type BookingStatus = (typeof BOOKING_STATUS)[number]
export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  AKTIF: 'Aktif',
  SELESAI: 'Selesai',
  BATAL: 'Batal',
}

export const CONTRACT_STATUS = ['MENUNGGU_DANA', 'AKTIF', 'SELESAI', 'BATAL'] as const
export type ContractStatus = (typeof CONTRACT_STATUS)[number]

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  MENUNGGU_DANA: 'Menunggu Dana',
  AKTIF: 'Aktif',
  SELESAI: 'Selesai',
  BATAL: 'Batal',
}

export const SUPPLIER_TYPE = ['LELANG', 'MEDIATOR', 'FOLLOWERS'] as const
export type SupplierType = (typeof SUPPLIER_TYPE)[number]
export const SUPPLIER_TYPE_LABEL: Record<SupplierType, string> = {
  LELANG: 'Lelang',
  MEDIATOR: 'Mediator',
  FOLLOWERS: 'Followers',
}

export const VENDOR_TYPE = ['BENGKEL', 'SALON', 'SPARE_PART', 'BODY_REPAIR', 'LAINNYA'] as const
export type VendorType = (typeof VENDOR_TYPE)[number]
export const VENDOR_TYPE_LABEL: Record<VendorType, string> = {
  BENGKEL: 'Bengkel',
  SALON: 'Salon',
  SPARE_PART: 'Spare Part',
  BODY_REPAIR: 'Body Repair',
  LAINNYA: 'Lainnya',
}

export const LEDGER_TYPE = [
  'SETORAN',
  'ALOKASI_MODAL',
  'PENGEMBALIAN_MODAL',
  'BAGI_HASIL',
  'PENARIKAN',
  'PENYESUAIAN',
] as const
export type LedgerType = (typeof LEDGER_TYPE)[number]

/** Label bahasa awam untuk dashboard investor (PRD 04 bagian 3.1). */
export const LEDGER_TYPE_LABEL: Record<LedgerType, string> = {
  SETORAN: 'Setoran Investasi',
  ALOKASI_MODAL: 'Modal Dipakai',
  PENGEMBALIAN_MODAL: 'Modal Kembali',
  BAGI_HASIL: 'Bagi Hasil',
  PENARIKAN: 'Penarikan Dana',
  PENYESUAIAN: 'Penyesuaian',
}

export const REPAIR_STATUS = ['PROSES', 'SELESAI'] as const
export type RepairStatus = (typeof REPAIR_STATUS)[number]
export const REPAIR_STATUS_LABEL: Record<RepairStatus, string> = {
  PROSES: 'Proses',
  SELESAI: 'Selesai',
}

export const JENIS_PERBAIKAN = [
  'Mesin',
  'Body',
  'Interior',
  'Kaki-kaki',
  'Salon',
  'Lainnya',
] as const

export const PAYMENT_METHOD = ['TUNAI', 'TRANSFER', 'KREDIT'] as const
export type PaymentMethod = (typeof PAYMENT_METHOD)[number]
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  TUNAI: 'Tunai',
  TRANSFER: 'Transfer',
  KREDIT: 'Kredit / Leasing',
}

export const TRANSMISI = ['MANUAL', 'MATIC'] as const
export const TRANSMISI_LABEL: Record<string, string> = {
  MANUAL: 'Manual',
  MATIC: 'Matic',
}

export const USER_ROLE = ['admin', 'holding', 'investor'] as const
export type UserRole = (typeof USER_ROLE)[number]
export const USER_ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  holding: 'Holding',
  investor: 'Investor',
}

export const KATEGORI_OPEX = ['Gaji', 'Sewa', 'Listrik', 'Marketing', 'Lainnya'] as const

export const KATEGORI_ASET = [
  'Peralatan Kantor',
  'Kendaraan Operasional',
  'Elektronik',
  'Furnitur',
  'Lainnya',
] as const

export const ASSET_STATUS = ['AKTIF', 'DIJUAL', 'DIHAPUS'] as const
export type AssetStatus = (typeof ASSET_STATUS)[number]
export const ASSET_STATUS_LABEL: Record<AssetStatus, string> = {
  AKTIF: 'Aktif',
  DIJUAL: 'Dijual',
  DIHAPUS: 'Dihapus',
}

/* ----------------------------- Kas & Bank ---------------------------- */

export const CASH_TYPE = [
  'SETORAN_INVESTOR',
  'PENARIKAN_INVESTOR',
  'PEMBELIAN_UNIT',
  'PERBAIKAN',
  'PENJUALAN_UNIT',
  'BIAYA_PENJUALAN',
  'BIAYA_OPERASIONAL',
  'PEMBELIAN_ASET',
  'SETOR_MODAL_PENGELOLA',
  'PRIVE_PENGELOLA',
  'TRANSFER_MASUK',
  'TRANSFER_KELUAR',
  'PENYESUAIAN',
] as const
export type CashType = (typeof CASH_TYPE)[number]

export const CASH_TYPE_LABEL: Record<CashType, string> = {
  SETORAN_INVESTOR: 'Setoran Investor',
  PENARIKAN_INVESTOR: 'Penarikan Investor',
  PEMBELIAN_UNIT: 'Pembelian Unit',
  PERBAIKAN: 'Perbaikan',
  PENJUALAN_UNIT: 'Penjualan Unit',
  BIAYA_PENJUALAN: 'Biaya Penjualan',
  BIAYA_OPERASIONAL: 'Biaya Operasional',
  PEMBELIAN_ASET: 'Pembelian Aset',
  SETOR_MODAL_PENGELOLA: 'Setor Modal Pengelola',
  PRIVE_PENGELOLA: 'Pencairan Hak Pengelola',
  TRANSFER_MASUK: 'Transfer Masuk',
  TRANSFER_KELUAR: 'Transfer Keluar',
  PENYESUAIAN: 'Penyesuaian',
}

/**
 * Jenis mutasi yang boleh diinput manual. Sisanya dicatat otomatis oleh
 * trigger database dari transaksi aslinya — kalau diinput manual lagi,
 * uangnya terhitung dua kali.
 */
export const CASH_TYPE_MANUAL = [
  'SETOR_MODAL_PENGELOLA',
  'PRIVE_PENGELOLA',
  'TRANSFER_MASUK',
  'TRANSFER_KELUAR',
  'PENYESUAIAN',
] as const satisfies readonly CashType[]

/** Warna seri chart — samakan dengan --accent di app/globals.css (brand blue #006ead). */
export const CHART_COLORS = {
  accent: '#006ead',
  success: '#16a34a',
  danger: '#dc2626',
  muted: '#94a3b8',
  total: '#334155',
  grid: '#e5e7eb',
} as const

export type PeriodePreset = 'bulan-ini' | '3-bulan' | '6-bulan' | 'tahun-ini' | 'tahun' | 'custom'

export const PERIODE_PRESET: { value: PeriodePreset; label: string }[] = [
  { value: 'bulan-ini', label: 'Bulan Ini' },
  { value: '3-bulan', label: '3 Bulan' },
  { value: '6-bulan', label: '6 Bulan' },
  { value: 'tahun-ini', label: 'Tahun Ini' },
  { value: 'tahun', label: 'Pilih Tahun' },
  { value: 'custom', label: 'Custom' },
]
