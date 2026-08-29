'use server'

import { revalidatePath } from 'next/cache'
import { jalankan, cek } from './_helper'
import { pembelianSchema, perbaruiPembelianSchema } from '@/lib/validations'
import { totalRincian } from '@/lib/calc'
import type { AllocationPreviewRow } from '@/types/database'

const PATHS = [
  '/transaksi/pembelian',
  '/transaksi/stock',
  '/master/mobil',
  '/master/investor',
  '/dashboard',
  '/investor',
]

/**
 * Hitung alokasi modal proporsional terhadap saldo tersedia.
 * Dihitung di SERVER (PRD 03 bagian 3) supaya sisa pembulatan
 * dibebankan konsisten dan total selalu pas.
 */
export async function previewAlokasi(totalModal: number) {
  return jalankan<AllocationPreviewRow[]>(
    async (db) => {
      const rows = cek(await db.rpc('fn_preview_allocation', { p_total: totalModal })) as any[]
      return (rows ?? []).map((r) => ({
        investor_id: r.investor_id,
        nama: r.nama,
        saldo: Number(r.saldo),
        porsi_pct: Number(r.porsi_pct),
        amount: Number(r.amount),
      }))
    },
    { skipAuth: true },
  )
}

/**
 * Simpan pembelian + alokasi modal investor.
 * Alokasi dijalankan lewat function `allocate_purchase_funding` supaya
 * validasi saldo, insert car_fundings, entri ledger, dan update status unit
 * terjadi dalam satu transaksi database.
 */
export async function buatPembelian(input: unknown) {
  const parsed = pembelianSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const v = parsed.data
  const biayaLain = totalRincian(v.rincian_biaya_lain)
  const totalModal = Math.round(v.harga_beli) + biayaLain

  const totalAlokasi = v.alokasi.reduce((s, a) => s + a.amount, 0)
  if (totalAlokasi !== totalModal) {
    return {
      ok: false as const,
      error: `Total alokasi (${totalAlokasi.toLocaleString('id-ID')}) harus sama persis dengan total modal (${totalModal.toLocaleString('id-ID')}).`,
    }
  }

  const res = await jalankan(async (db) => {
    const sudahAda = cek(
      await db.from('purchases').select('id').eq('car_id', v.car_id).maybeSingle(),
    )
    if (sudahAda) throw new Error('Unit ini sudah punya transaksi pembelian.')

    const no = cek(await db.rpc('fn_next_doc_number', { p_prefix: 'BLI', p_date: v.tanggal_beli }))

    const purchase = cek(
      await db
        .from('purchases')
        .insert({
          no_transaksi: no,
          car_id: v.car_id,
          supplier_id: v.supplier_id || null,
          tanggal_beli: v.tanggal_beli,
          harga_beli: v.harga_beli,
          biaya_lain: biayaLain,
          rincian_biaya_lain: v.rincian_biaya_lain,
          catatan: v.catatan,
        })
        .select('id')
        .single(),
    ) as { id: string }

    try {
      cek(
        await db.rpc('allocate_purchase_funding', {
          p_purchase_id: purchase.id,
          p_allocations: v.alokasi.filter((a) => a.amount > 0),
        }),
      )
    } catch (e) {
      // alokasi gagal -> buang header pembelian supaya tidak ada data setengah jadi
      await db.from('purchases').delete().eq('id', purchase.id)
      throw e
    }

    return purchase
  })

  if (res.ok) PATHS.forEach((p) => revalidatePath(p))
  return res
}

/** Alokasi pendana yang sudah tersimpan untuk satu pembelian — dipakai mengisi form edit. */
export async function getAlokasiPembelian(purchaseId: string) {
  return jalankan<{ investor_id: string; nama: string; amount: number }[]>(
    async (db) => {
      const rows = cek(
        await db
          .from('car_fundings')
          .select('investor_id, amount, investors(nama)')
          .eq('purchase_id', purchaseId),
      ) as any[]
      return rows.map((r) => ({
        investor_id: r.investor_id as string,
        nama: (r.investors?.nama as string) ?? '-',
        amount: Number(r.amount),
      }))
    },
    { skipAuth: true },
  )
}

/**
 * Edit pembelian yang sudah dibuat — unit (car_id) sengaja tidak bisa
 * diubah dari sini. Realokasi dana investor (delete alokasi lama lalu
 * insert yang baru) dijalankan lewat satu fungsi database supaya atomik
 * dan tidak mungkin dobel potong / dobel hitung saldo.
 */
export async function perbaruiPembelian(input: unknown) {
  const parsed = perbaruiPembelianSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const v = parsed.data
  const biayaLain = totalRincian(v.rincian_biaya_lain)
  const totalModal = Math.round(v.harga_beli) + biayaLain

  const totalAlokasi = v.alokasi.reduce((s, a) => s + a.amount, 0)
  if (totalAlokasi !== totalModal) {
    return {
      ok: false as const,
      error: `Total alokasi (${totalAlokasi.toLocaleString('id-ID')}) harus sama persis dengan total modal (${totalModal.toLocaleString('id-ID')}).`,
    }
  }

  const res = await jalankan(async (db) => {
    cek(
      await db.rpc('update_purchase_funding', {
        p_purchase_id: v.id,
        p_supplier_id: v.supplier_id || null,
        p_tanggal_beli: v.tanggal_beli,
        p_harga_beli: v.harga_beli,
        p_biaya_lain: biayaLain,
        p_rincian_biaya_lain: v.rincian_biaya_lain,
        p_catatan: v.catatan,
        p_allocations: v.alokasi.filter((a) => a.amount > 0),
      }),
    )
    return { id: v.id }
  })

  if (res.ok) {
    PATHS.forEach((p) => revalidatePath(p))
    revalidatePath('/master/investor')
    revalidatePath('/investor')
  }
  return res
}
