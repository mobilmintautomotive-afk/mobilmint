import { z } from 'zod'
import {
  CAR_STATUS,
  CASH_TYPE_MANUAL,
  PAYMENT_METHOD,
  REPAIR_STATUS,
  SUPPLIER_TYPE,
  USER_ROLE,
  VENDOR_TYPE,
} from '@/lib/constants'

/** Semua pesan error berbahasa Indonesia (PRD 02 prinsip UI global). */

const wajib = (nama: string) => z.string().trim().min(1, `${nama} wajib diisi`)
const opsional = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))

const uang = z
  .coerce.number({ message: 'Harus berupa angka' })
  .min(0, 'Tidak boleh negatif')

const uangBolehMinus = z.coerce.number({ message: 'Harus berupa angka' })

const tanggal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid')

const rincianBiaya = z
  .array(
    z.object({
      nama: z.string().trim().min(1, 'Nama biaya wajib diisi'),
      nominal: uang,
    }),
  )
  .default([])

/* ------------------------------- Mobil ------------------------------- */

export const mobilSchema = z.object({
  id: z.string().uuid().optional(),
  merek: wajib('Merek'),
  tipe: wajib('Tipe'),
  tahun: z.coerce
    .number({ message: 'Tahun harus berupa angka' })
    .int('Tahun harus bilangan bulat')
    .min(1980, 'Tahun minimal 1980')
    .max(new Date().getFullYear() + 1, 'Tahun tidak valid'),
  warna: opsional,
  no_polisi: opsional,
  no_rangka: opsional,
  no_mesin: opsional,
  transmisi: z.enum(['MANUAL', 'MATIC']).optional().nullable(),
  kilometer: z.coerce.number().int().min(0, 'Kilometer tidak boleh negatif').optional().nullable(),
  tanggal_pajak: z.union([tanggal, z.literal('')]).optional().nullable(),
  status: z.enum(CAR_STATUS).optional(),
  foto_urls: z.array(z.string()).max(10, 'Maksimal 10 foto').default([]),
  catatan: opsional,
})
export type MobilInput = z.input<typeof mobilSchema>

/* ------------------------------ Investor ----------------------------- */

export const investorSchema = z.object({
  id: z.string().uuid().optional(),
  nama: wajib('Nama investor'),
  alamat: opsional,
  no_tlp: opsional,
  email: z
    .union([z.email('Format email tidak valid'), z.literal('')])
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  no_ktp: opsional,
  nama_bank: opsional,
  no_rekening: opsional,
  atas_nama_rekening: opsional,
  catatan: opsional,
  is_active: z.boolean().default(true),
})

/* ------------------ Customer / Sales / Supplier / Vendor ------------------ */

export const customerSchema = z.object({
  id: z.string().uuid().optional(),
  nama: wajib('Nama customer'),
  alamat: opsional,
  no_tlp: opsional,
  no_ktp: opsional,
  catatan: opsional,
})

export const salesSchema = z.object({
  id: z.string().uuid().optional(),
  nama: wajib('Nama sales'),
  alamat: opsional,
  no_tlp: opsional,
  komisi_default: uang.default(0),
  is_active: z.boolean().default(true),
})

export const supplierSchema = z.object({
  id: z.string().uuid().optional(),
  nama: wajib('Nama supplier'),
  alamat: opsional,
  no_tlp: opsional,
  tipe_supplier: z.enum(SUPPLIER_TYPE, { message: 'Tipe supplier wajib dipilih' }),
  catatan: opsional,
  is_active: z.boolean().default(true),
})

export const vendorSchema = z.object({
  id: z.string().uuid().optional(),
  nama: wajib('Nama vendor'),
  alamat: opsional,
  no_tlp: opsional,
  tipe_vendor: z.enum(VENDOR_TYPE, { message: 'Tipe vendor wajib dipilih' }),
  catatan: opsional,
  is_active: z.boolean().default(true),
})

/* -------------------------------- Akad ------------------------------- */

export const akadSchema = z
  .object({
    id: z.string().uuid().optional(),
    investor_id: z.string().uuid({ message: 'Investor wajib dipilih' }),
    nilai_investasi: uang.refine((v) => v > 0, 'Nilai investasi harus lebih dari nol'),
    nisbah_investor_pct: z.coerce
      .number({ message: 'Nisbah harus berupa angka' })
      .min(0, 'Nisbah minimal 0')
      .max(100, 'Nisbah maksimal 100'),
    nisbah_pengelola_pct: z.coerce.number().min(0).max(100),
    tanggal_akad: tanggal,
    tenor_bulan: z.coerce.number().int().min(0).optional().nullable(),
    dokumen_url: opsional,
    catatan: opsional,
  })
  .refine((v) => v.nisbah_investor_pct + v.nisbah_pengelola_pct === 100, {
    message: 'Nisbah investor + nisbah pengelola harus tepat 100%',
    path: ['nisbah_investor_pct'],
  })

export const konfirmasiDanaSchema = z.object({
  contract_id: z.string().uuid(),
  tanggal_dana_diterima: tanggal,
  jumlah_diterima: uang.refine((v) => v > 0, 'Jumlah diterima harus lebih dari nol'),
  bukti_transfer_url: opsional,
})

/* ------------------------------ Pembelian ---------------------------- */

export const pembelianSchema = z.object({
  car_id: z.string().uuid({ message: 'Unit mobil wajib dipilih' }),
  supplier_id: z.string().uuid().optional().nullable(),
  tanggal_beli: tanggal,
  harga_beli: uang.refine((v) => v > 0, 'Harga beli wajib diisi'),
  rincian_biaya_lain: rincianBiaya,
  catatan: opsional,
  alokasi: z
    .array(
      z.object({
        investor_id: z.string().uuid(),
        amount: uang,
      }),
    )
    .min(1, 'Alokasi modal investor belum terisi'),
})

/* ------------------------------ Perbaikan ---------------------------- */

export const perbaikanSchema = z.object({
  id: z.string().uuid().optional(),
  car_id: z.string().uuid({ message: 'Unit mobil wajib dipilih' }),
  vendor_id: z.string().uuid().optional().nullable(),
  jenis_perbaikan: wajib('Jenis perbaikan'),
  deskripsi: opsional,
  biaya: uang,
  tanggal_masuk: tanggal,
  tanggal_selesai: z.union([tanggal, z.literal('')]).optional().nullable(),
  status: z.enum(REPAIR_STATUS).default('PROSES'),
  ambil_dari_modal: z.boolean().default(false),
})

/* ------------------------------ Penjualan ---------------------------- */

export const penjualanSchema = z.object({
  car_id: z.string().uuid({ message: 'Unit mobil wajib dipilih' }),
  customer_id: z.string().uuid().optional().nullable(),
  sales_person_id: z.string().uuid().optional().nullable(),
  tanggal_jual: tanggal,
  harga_jual: uang.refine((v) => v > 0, 'Harga jual wajib diisi'),
  komisi_sales: uang.default(0),
  rincian_biaya_lain: rincianBiaya,
  metode_bayar: z.enum(PAYMENT_METHOD).default('TRANSFER'),
  catatan: opsional,
})

/* ----------------------------- Bagi Hasil ---------------------------- */

export const bagiHasilSchema = z.object({
  car_sale_id: z.string().uuid(),
  tanggal_proses: tanggal,
})

/* ----------------------------- Penarikan ----------------------------- */

export const penarikanSchema = z.object({
  investor_id: z.string().uuid(),
  amount: uang.refine((v) => v > 0, 'Jumlah penarikan harus lebih dari nol'),
  tanggal: tanggal,
  catatan: opsional,
})

/* ------------------------- Biaya operasional ------------------------- */

export const asetSchema = z.object({
  id: z.string().uuid().optional(),
  nama: wajib('Nama aset'),
  kategori: wajib('Kategori'),
  tanggal_beli: tanggal,
  harga_beli: uang.refine((v) => v > 0, 'Harga beli wajib diisi'),
  umur_manfaat_bulan: z.coerce
    .number()
    .int('Umur manfaat harus bilangan bulan bulat')
    .min(1, 'Minimal 1 bulan')
    .optional()
    .nullable(),
  nilai_residu: uang.default(0),
  catatan: opsional,
})

export const opexSchema = z.object({
  id: z.string().uuid().optional(),
  tanggal: tanggal,
  kategori: wajib('Kategori'),
  keterangan: opsional,
  nominal: uang.refine((v) => v > 0, 'Nominal wajib diisi'),
})

/* ----------------------------- Kas & Bank ---------------------------- */

export const bankSchema = z.object({
  id: z.string().uuid().optional(),
  nama: wajib('Nama rekening'),
  nama_bank: wajib('Nama bank'),
  no_rekening: wajib('Nomor rekening'),
  atas_nama: wajib('Atas nama'),
  saldo_awal: uang.default(0),
  tanggal_saldo_awal: tanggal,
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
  catatan: opsional,
})

export const mutasiKasSchema = z.object({
  bank_account_id: z.string().uuid('Pilih rekening dulu'),
  tanggal: tanggal,
  tipe: z.enum(CASH_TYPE_MANUAL, 'Jenis mutasi tidak bisa diinput manual'),
  /** Selalu positif di form; arah masuk/keluar ditentukan dari `tipe`. */
  nominal: uang.refine((v) => v > 0, 'Nominal wajib diisi'),
  keterangan: wajib('Keterangan'),
})

export const priveSchema = z.object({
  bank_account_id: z.string().uuid('Pilih rekening dulu'),
  tanggal: tanggal,
  nominal: uang.refine((v) => v > 0, 'Nominal wajib diisi'),
  keterangan: opsional,
})

/* ------------------------------ Pengguna ----------------------------- */

export const penggunaSchema = z
  .object({
    id: z.string().uuid().optional(),
    nama: wajib('Nama lengkap'),
    email: z.email('Format email tidak valid'),
    role: z.enum(USER_ROLE, { message: 'Role wajib dipilih' }),
    investor_id: z.string().uuid().optional().nullable(),
    is_active: z.boolean().default(true),
  })
  .refine((v) => v.role !== 'investor' || Boolean(v.investor_id), {
    message: 'Akun investor wajib dihubungkan ke data investor',
    path: ['investor_id'],
  })

/* ----------------------------- Pengaturan ---------------------------- */

export const pengaturanSchema = z.object({
  nama_perusahaan: wajib('Nama perusahaan'),
  logo_url: opsional,
  alamat: opsional,
  no_tlp: opsional,
  default_nisbah_pengelola: z.coerce.number().min(0).max(100),
  ambang_umur_stok: z.coerce.number().int().min(1, 'Minimal 1 hari'),
})

export { uangBolehMinus }
