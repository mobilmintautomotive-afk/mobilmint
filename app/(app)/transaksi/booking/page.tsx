import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { BookingClient } from '@/components/transaksi/booking-client'
import { getDaftarBooking, getUnitSiapJual } from '@/lib/queries/transaksi'
import { getOpsiDropdown } from '@/lib/queries/master'
import { canWrite } from '@/lib/dev-role'

export const metadata: Metadata = { title: 'Booking' }

export default async function BookingPage() {
  const [booking, unit, opsi, bolehTulis] = await Promise.all([
    getDaftarBooking(),
    getUnitSiapJual(),
    getOpsiDropdown(),
    canWrite(),
  ])

  return (
    <>
      <PageHeader
        title="Booking"
        description="Unit yang sudah bayar DP tapi belum lunas. Untuk pelunasan, buka menu Penjualan."
        breadcrumb={[{ label: 'Penjualan' }, { label: 'Booking' }]}
      />
      <BookingClient
        rows={booking.data}
        error={booking.error}
        canWrite={bolehTulis}
        units={unit.data}
        customers={opsi.data.customers}
        sales={opsi.data.sales}
      />
    </>
  )
}
