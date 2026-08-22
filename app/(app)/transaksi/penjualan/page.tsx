import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { PenjualanClient } from '@/components/transaksi/penjualan-client'
import { BookingClient } from '@/components/transaksi/booking-client'
import { getDaftarPenjualan, getDaftarBooking, getUnitSiapJual } from '@/lib/queries/transaksi'
import { getOpsiDropdown } from '@/lib/queries/master'
import { canWrite } from '@/lib/dev-role'

export const metadata: Metadata = { title: 'Penjualan Mobil' }

export default async function PenjualanPage({
  searchParams,
}: {
  searchParams: { unit?: string }
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
      {booking.data.length > 0 || bolehTulis ? (
        <div className="mb-2">
          <h2 className="mb-3 text-card-title text-ink">Booking Aktif (DP Belum Lunas)</h2>
          <BookingClient
            rows={booking.data}
            error={booking.error}
            canWrite={bolehTulis}
            units={unit.data}
            customers={opsi.data.customers}
            sales={opsi.data.sales}
          />
        </div>
      ) : null}

      <h2 className="mb-3 text-card-title text-ink">Riwayat Penjualan</h2>
      <PenjualanClient
        rows={list.data}
        error={list.error}
        canWrite={bolehTulis}
        units={unit.data}
        customers={opsi.data.customers}
        sales={opsi.data.sales}
        unitTerpilih={searchParams.unit ?? null}
      />
    </>
  )
}
