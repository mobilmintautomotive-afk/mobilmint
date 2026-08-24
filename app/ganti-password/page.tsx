import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Logo } from '@/components/layout/logo'
import { getCurrentUser } from '@/lib/dev-role'
import { GantiPasswordForm } from './ganti-password-form'

export const metadata: Metadata = { title: 'Ganti Password' }

export default async function GantiPasswordPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Logo size="lg" className="justify-center" />
          <p className="mt-2 text-label text-ink-muted">
            {user.must_change_password
              ? 'Password sementara dari admin harus diganti dulu sebelum lanjut.'
              : 'Ganti password akun Anda.'}
          </p>
        </div>

        <div className="rounded-xl border border-line-strong bg-surface p-6 shadow-sm">
          <GantiPasswordForm wajib={user.must_change_password} />
        </div>
      </div>
    </div>
  )
}
