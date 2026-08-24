import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { getCurrentUser } from '@/lib/dev-role'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.must_change_password) redirect('/ganti-password')

  return (
    <AppShell nama={user.nama} email={user.email} role={user.role}>
      {children}
    </AppShell>
  )
}
