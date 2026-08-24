import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { getCurrentUser, getRealUser } from '@/lib/dev-role'
import { getInvestorRingkas } from '@/lib/queries/master'
import { USER_ROLE_LABEL } from '@/lib/constants'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.must_change_password) redirect('/ganti-password')

  const real = await getRealUser()
  const isAdmin = real?.role === 'admin'
  const investors = isAdmin ? ((await getInvestorRingkas()) ?? []) : []

  const sedangLihatSebagai = isAdmin && real!.role !== user.role
  const viewingAsLabel = sedangLihatSebagai
    ? user.role === 'investor'
      ? `Investor — ${investors.find((i) => i.id === user.investor_id)?.nama ?? 'tidak dikenal'}`
      : USER_ROLE_LABEL[user.role]
    : null

  return (
    <AppShell
      nama={real?.nama ?? user.nama}
      email={real?.email ?? user.email}
      role={user.role}
      isAdmin={isAdmin}
      viewingAsLabel={viewingAsLabel}
      investors={investors}
    >
      {children}
    </AppShell>
  )
}
