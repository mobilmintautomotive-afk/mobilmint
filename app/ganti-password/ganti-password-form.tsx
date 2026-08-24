'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { gantiPasswordSendiri } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'

export function GantiPasswordForm({ wajib }: { wajib: boolean }) {
  const router = useRouter()
  const [password, setPassword] = React.useState('')
  const [konfirmasi, setKonfirmasi] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password baru minimal 8 karakter.')
      return
    }
    if (password !== konfirmasi) {
      setError('Konfirmasi password tidak sama.')
      return
    }

    startTransition(async () => {
      const res = await gantiPasswordSendiri(password)
      if (!res.ok) {
        setError(res.error)
        return
      }
      toast.success('Password berhasil diganti.')
      router.push('/')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Password Baru" required htmlFor="pw-baru">
        <Input
          id="pw-baru"
          type="password"
          autoComplete="new-password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      <Field
        label="Konfirmasi Password Baru"
        required
        htmlFor="pw-konfirmasi"
        error={error ?? undefined}
      >
        <Input
          id="pw-konfirmasi"
          type="password"
          autoComplete="new-password"
          required
          value={konfirmasi}
          onChange={(e) => setKonfirmasi(e.target.value)}
        />
      </Field>

      <Button type="submit" className="w-full" loading={pending}>
        <KeyRound className="size-4" />
        Simpan Password Baru
      </Button>

      {!wajib ? (
        <Button type="button" variant="ghost" className="w-full" onClick={() => router.back()}>
          Batal
        </Button>
      ) : null}
    </form>
  )
}
