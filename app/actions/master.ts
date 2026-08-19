'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { jalankan, cek, type AksiHasil } from './_helper'
import {
  customerSchema,
  investorSchema,
  mobilSchema,
  salesSchema,
  supplierSchema,
  vendorSchema,
  penarikanSchema,
  opexSchema,
  asetSchema,
  penggunaSchema,
  pengaturanSchema,
} from '@/lib/validations'

/* --------------------------------------------------------------------- */
/* Helper CRUD generik                                                    */
/* --------------------------------------------------------------------- */

async function simpan(
  tabel: string,
  schema: z.ZodTypeAny,
  input: unknown,
  paths: string[],
): Promise<AksiHasil<{ id: string }>> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const { id, ...values } = parsed.data as Record<string, any>

  const res = await jalankan(async (db) => {
    if (id) {
      const r = cek(await db.from(tabel).update(values).eq('id', id).select('id').single())
      return r as { id: string }
    }
    const r = cek(await db.from(tabel).insert(values).select('id').single())
    return r as { id: string }
  })

  if (res.ok) paths.forEach((p) => revalidatePath(p))
  return res
}

async function hapus(tabel: string, id: string, paths: string[]): Promise<AksiHasil> {
  const res = await jalankan(async (db) => {
    cek(await db.from(tabel).delete().eq('id', id).select('id'))
    return undefined
  })
  if (res.ok) paths.forEach((p) => revalidatePath(p))
  return res
}

/* ------------------------------- Mobil ------------------------------- */

export async function simpanMobil(input: unknown) {
  return simpan('cars', mobilSchema, input, ['/master/mobil', '/transaksi/stock', '/dashboard'])
}

export async function hapusMobil(id: string) {
  const cekPakai = await jalankan(async (db) => {
    const [beli, jual, perbaikan] = await Promise.all([
      db.from('purchases').select('id').eq('car_id', id).limit(1),
      db.from('car_sales').select('id').eq('car_id', id).limit(1),
      db.from('repairs').select('id').eq('car_id', id).limit(1),
    ])
    return (beli.data?.length ?? 0) + (jual.data?.length ?? 0) + (perbaikan.data?.length ?? 0)
  })
  if (!cekPakai.ok) return cekPakai
  if ((cekPakai.data ?? 0) > 0) {
    return {
      ok: false as const,
      error: 'Unit ini sudah punya transaksi, jadi tidak bisa dihapus.',
    }
  }
  return hapus('cars', id, ['/master/mobil'])
}

/** Tandai unit siap jual (dipanggil dari halaman detail & perbaikan). */
export async function tandaiSiapJual(carId: string) {
  const res = await jalankan(async (db) => {
    const car = cek(await db.from('cars').select('status').eq('id', carId).single()) as any
    if (!['DIBELI', 'PERBAIKAN'].includes(car.status)) {
      throw new Error('Hanya unit berstatus Dibeli atau Perbaikan yang bisa ditandai siap jual.')
    }
    cek(await db.from('cars').update({ status: 'READY_STOCK' }).eq('id', carId).select('id'))
    cek(
      await db
        .from('repairs')
        .update({ status: 'SELESAI' })
        .eq('car_id', carId)
        .eq('status', 'PROSES')
        .select('id'),
    )
    return undefined
  })
  if (res.ok) {
    revalidatePath('/master/mobil')
    revalidatePath(`/master/mobil/${carId}`)
    revalidatePath('/transaksi/stock')
    revalidatePath('/transaksi/perbaikan')
  }
  return res
}

/* ------------------------------ Investor ----------------------------- */

export async function simpanInvestor(input: unknown) {
  return simpan('investors', investorSchema, input, ['/master/investor', '/dashboard'])
}

export async function hapusInvestor(id: string) {
  const cekPakai = await jalankan(async (db) => {
    const [akad, ledger] = await Promise.all([
      db.from('investor_contracts').select('id').eq('investor_id', id).limit(1),
      db.from('investor_ledger').select('id').eq('investor_id', id).limit(1),
    ])
    return (akad.data?.length ?? 0) + (ledger.data?.length ?? 0)
  })
  if (!cekPakai.ok) return cekPakai
  if ((cekPakai.data ?? 0) > 0) {
    return {
      ok: false as const,
      error:
        'Investor ini sudah punya akad atau mutasi saldo. Nonaktifkan saja lewat tombol Edit, jangan dihapus, supaya jejak keuangannya tetap utuh.',
    }
  }
  return hapus('investors', id, ['/master/investor'])
}

/** Catat penarikan dana investor (ledger PENARIKAN, negatif). */
export async function catatPenarikan(input: unknown) {
  const parsed = penarikanSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const v = parsed.data

  const res = await jalankan(async (db) => {
    cek(
      await db.rpc('record_withdrawal', {
        p_investor_id: v.investor_id,
        p_amount: v.amount,
        p_tanggal: v.tanggal,
        p_catatan: v.catatan ?? 'Penarikan dana investor',
      }),
    )
    return undefined
  })

  if (res.ok) {
    revalidatePath('/master/investor')
    revalidatePath(`/master/investor/${v.investor_id}`)
    revalidatePath('/investor')
    revalidatePath('/dashboard')
  }
  return res
}

/* --------------------- Customer / Sales / Supplier / Vendor ---------------------- */

export async function simpanCustomer(input: unknown) {
  return simpan('customers', customerSchema, input, ['/master/customer', '/transaksi/penjualan'])
}
export async function hapusCustomer(id: string) {
  return hapus('customers', id, ['/master/customer'])
}

export async function simpanSales(input: unknown) {
  return simpan('sales_persons', salesSchema, input, ['/master/sales', '/transaksi/penjualan'])
}
export async function hapusSales(id: string) {
  return hapus('sales_persons', id, ['/master/sales'])
}

export async function simpanSupplier(input: unknown) {
  return simpan('suppliers', supplierSchema, input, ['/master/supplier', '/transaksi/pembelian'])
}
export async function hapusSupplier(id: string) {
  return hapus('suppliers', id, ['/master/supplier'])
}

export async function simpanVendor(input: unknown) {
  return simpan('vendors', vendorSchema, input, ['/master/vendor', '/transaksi/perbaikan'])
}
export async function hapusVendor(id: string) {
  return hapus('vendors', id, ['/master/vendor'])
}

/* ------------------------- Biaya operasional ------------------------- */

export async function simpanOpex(input: unknown) {
  return simpan('operational_expenses', opexSchema, input, [
    '/laporan/laba-rugi',
    '/laporan/neraca',
    '/dashboard',
  ])
}
export async function hapusOpex(id: string) {
  return hapus('operational_expenses', id, ['/laporan/laba-rugi', '/laporan/neraca', '/dashboard'])
}

/* -------------------------- Aset Perusahaan --------------------------- */
/**
 * Sengaja TIDAK memotong saldo investor — dicatat sebagai pengeluaran
 * milik pengelola (sama seperti Biaya Operasional). Investor mendanai
 * jual-beli mobil, bukan aset tetap kantor.
 */
export async function simpanAset(input: unknown) {
  return simpan('company_assets', asetSchema, input, ['/transaksi/aset', '/laporan/neraca'])
}
export async function hapusAset(id: string) {
  return hapus('company_assets', id, ['/transaksi/aset', '/laporan/neraca'])
}

/* ------------------------------ Pengguna ----------------------------- */

/**
 * Fase 4: hanya menulis ke tabel `profiles`, belum membuat user auth.
 * Fase 5 akan menyambungkan ke supabase.auth.admin.inviteUserByEmail.
 */
export async function simpanPengguna(input: unknown) {
  return simpan('profiles', penggunaSchema, input, ['/admin/users'])
}

export async function ubahStatusPengguna(id: string, aktif: boolean) {
  const res = await jalankan(async (db) => {
    cek(await db.from('profiles').update({ is_active: aktif }).eq('id', id).select('id'))
    return undefined
  })
  if (res.ok) revalidatePath('/admin/users')
  return res
}

/* ----------------------------- Pengaturan ---------------------------- */

export async function simpanPengaturan(input: unknown) {
  const parsed = pengaturanSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const res = await jalankan(async (db) => {
    cek(await db.from('app_settings').update(parsed.data).eq('id', 1).select('id'))
    return undefined
  })
  if (res.ok) {
    revalidatePath('/admin/pengaturan')
    revalidatePath('/laporan/laba-rugi')
  }
  return res
}
