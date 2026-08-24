import type { Metadata } from 'next'
import { Logo } from '@/components/layout/logo'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Masuk' }

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Logo size="lg" className="justify-center" />
          <p className="mt-2 text-label text-ink-muted">Masuk untuk mengelola data trading mobil</p>
        </div>

        <div className="rounded-xl border border-line-strong bg-surface p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
