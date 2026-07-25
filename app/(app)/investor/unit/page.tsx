import type { Metadata } from 'next'
import { Wallet } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { UnitDidanaiTable } from '@/components/investor/unit-didanai-table'
import { getDashboardInvestor } from '@/lib/queries/investor'
import { getCurrentInvestorId } from '@/lib/dev-role'

export const metadata: Metadata = { title: 'Unit Saya' }

export default async function UnitSayaPage() {
  const investorId = await getCurrentInvestorId()

  if (!investorId) {
    return (
      <div className="mm-card">
        <EmptyState
          icon={Wallet}
          title="Belum ada investor yang dipilih"
          description="Gunakan tombol role di pojok kanan atas untuk memilih investor."
        />
      </div>
    )
  }

  const { data, error } = await getDashboardInvestor(investorId)

  return (
    <>
      <PageHeader
        title="Unit Saya"
        description="Semua mobil yang dibeli memakai dana Anda, beserta status dan bagi hasilnya."
      />
      {error ? (
        <div className="mm-card">
          <ErrorState description={error} />
        </div>
      ) : (
        <UnitDidanaiTable rows={data.unitDidanai} />
      )}
    </>
  )
}
