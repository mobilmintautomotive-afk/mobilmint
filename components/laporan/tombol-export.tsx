'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { FileDown, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatTanggal } from '@/lib/format'

export type BarisLaporan = {
  unit: string
  no_polisi: string | null
  no_transaksi: string
  tanggal_jual: string
  harga_jual: number
  modal_pembelian: number
  biaya_perbaikan: number
  hpp: number
  komisi_sales: number
  biaya_lain: number
  laba_kotor: number
  laba_bersih: number
  bagi_hasil_investor: number
  bagi_hasil_pengelola: number
}

/** Tombol Export PDF & Excel untuk halaman laporan laba rugi. */
export function TombolExportLaporan({
  periodeQuery,
  rows,
  ringkasan,
  periodeLabel,
}: {
  periodeQuery: string
  rows: BarisLaporan[]
  ringkasan: Record<string, number>
  periodeLabel: string
}) {
  const [loadingPdf, setLoadingPdf] = React.useState(false)
  const [loadingXls, setLoadingXls] = React.useState(false)

  async function unduhPdf() {
    setLoadingPdf(true)
    try {
      const res = await fetch(`/api/export/pdf?jenis=laba-rugi&${periodeQuery}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Gagal membuat PDF')
      }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `laporan-laba-rugi-${periodeLabel.toLowerCase().replace(/\s+/g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal membuat PDF')
    } finally {
      setLoadingPdf(false)
    }
  }

  async function unduhExcel() {
    setLoadingXls(true)
    try {
      const XLSX = await import('xlsx')

      const sheetRingkas = XLSX.utils.aoa_to_sheet([
        ['Laporan Laba Rugi', periodeLabel],
        [],
        ['Pendapatan Penjualan', ringkasan.pendapatan],
        ['Harga Pokok Pembelian', -ringkasan.hppPembelian],
        ['Biaya Perbaikan', -ringkasan.biayaPerbaikan],
        ['Laba Kotor', ringkasan.pendapatan - ringkasan.hppPembelian - ringkasan.biayaPerbaikan],
        ['Komisi Sales', -ringkasan.komisiSales],
        ['Biaya Penjualan Lain', -ringkasan.biayaPenjualanLain],
        ['Biaya Operasional', -ringkasan.biayaOperasional],
        ['Laba Bersih', ringkasan.labaBersih],
        ['Bagi Hasil Investor', -ringkasan.bagiHasilInvestor],
        ['Laba Bersih Pengelola', ringkasan.labaPengelola],
      ])

      const sheetUnit = XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          'No. Transaksi': r.no_transaksi,
          Unit: r.unit,
          'No. Polisi': r.no_polisi ?? '',
          'Tanggal Jual': formatTanggal(r.tanggal_jual),
          'Harga Jual': r.harga_jual,
          'Modal Pembelian': r.modal_pembelian,
          'Biaya Perbaikan': r.biaya_perbaikan,
          HPP: r.hpp,
          'Komisi Sales': r.komisi_sales,
          'Biaya Lain': r.biaya_lain,
          'Laba Kotor': r.laba_kotor,
          'Laba Bersih': r.laba_bersih,
          'Bagi Hasil Investor': r.bagi_hasil_investor,
          'Bagi Hasil Pengelola': r.bagi_hasil_pengelola,
        })),
      )

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, sheetRingkas, 'Ringkasan')
      XLSX.utils.book_append_sheet(wb, sheetUnit, 'Rincian per Unit')
      XLSX.writeFile(wb, `laporan-laba-rugi-${periodeLabel.toLowerCase().replace(/\s+/g, '-')}.xlsx`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal membuat Excel')
    } finally {
      setLoadingXls(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" onClick={unduhExcel} loading={loadingXls}>
        <FileSpreadsheet />
        <span className="hidden sm:inline">Export Excel</span>
      </Button>
      <Button onClick={unduhPdf} loading={loadingPdf}>
        <FileDown />
        <span className="hidden sm:inline">Download PDF</span>
        <span className="sm:hidden">PDF</span>
      </Button>
    </div>
  )
}
