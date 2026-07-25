'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Tombol download laporan PDF milik investor sendiri. */
export function TombolLaporanInvestor({
  nama,
  investorId,
}: {
  nama: string
  investorId?: string
}) {
  const [loading, setLoading] = React.useState(false)

  async function unduh() {
    setLoading(true)
    try {
      const url = investorId
        ? `/api/export/pdf?jenis=investor&id=${investorId}`
        : '/api/export/pdf?jenis=investor'
      const res = await fetch(url)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Gagal membuat laporan')
      }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `laporan-${nama.toLowerCase().replace(/\s+/g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal membuat laporan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="secondary" onClick={unduh} loading={loading}>
      <FileDown />
      Download Laporan Saya
    </Button>
  )
}
