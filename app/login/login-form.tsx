'use client'

import * as React from 'react'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'

export function LoginForm() {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await login(email.trim(), password)
      // Kalau berhasil, login() sudah redirect() dari server — baris ini
      // hanya kejalan kalau gagal.
      if (res && !res.ok) setError(res.error)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email" required htmlFor="login-email">
        <Input
          id="login-email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com"
        />
      </Field>

      <Field label="Password" required htmlFor="login-password" error={error ?? undefined}>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle transition-colors hover:text-ink"
            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>

      <Button type="submit" className="w-full" loading={pending}>
        <LogIn className="size-4" />
        Masuk
      </Button>
    </form>
  )
}
