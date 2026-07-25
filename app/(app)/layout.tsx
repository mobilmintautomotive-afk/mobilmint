import { AppShell } from '@/components/layout/app-shell'
import { getCurrentUser } from '@/lib/dev-role'
import { getInvestorRingkas } from '@/lib/queries/master'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  const investors = await getInvestorRingkas()

  return (
    <AppShell
      role={user?.role ?? 'admin'}
      investorId={user?.investor_id ?? null}
      investors={investors}
    >
      {children}
    </AppShell>
  )
}
