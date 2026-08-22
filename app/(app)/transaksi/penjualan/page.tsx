import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { PenjualanClient } from '@/components/transaksi/penjualan-client'
import { getDaftarPenjualan, getDaftarBooking, getUnitSiapJual } from '@/lib/queries/transaksi'
import { getOpsiDropdown } from '@/lib/queries/master'
import { canWrite } from '@/lib/dev-role'

export const metadata: Metadata = { title: 'Penjualan Mobil' }

export default async function PenjualanPage({
  searchParams,
}: {
  searchParams: { unit?: string; booking?: string }
}) {
  const [list, booking, unit, opsi, bolehTulis] = await Promise.all([
    getDaftarPenjualan(),
    getDaftarBooking(),
    getUnitSiapJual(),
    getOpsiDropdown(),
    canWrite(),
  ])

  return (
    <>
      <PageHeader
        title="Penjualan"
        description="Laba bersih dihitung langsung saat Anda mengetik harga jual."
        breadcrumb={[{ label: 'Penjualan' }]}
      />
      <PenjualanClient
        rows={list.data}
        error={list.error}
        canWrite={bolehTulis}
        units={unit.data}
        bookings={booking.data}
        customers={opsi.data.customers}
        sales={opsi.data.sales}
        unitTerpilih={searchParams.unit ?? null}
        bookingTerpilih={searchParams.booking ?? null}
      />
    </>
  )
}
