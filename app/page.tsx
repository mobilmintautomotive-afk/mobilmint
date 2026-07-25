import { redirect } from 'next/navigation'
import { getCurrentRole } from '@/lib/dev-role'

/** Arahkan sesuai role (PRD 01 bagian 4.3). */
export default async function RootPage() {
  const role = await getCurrentRole()
  redirect(role === 'investor' ? '/investor' : '/dashboard')
}
