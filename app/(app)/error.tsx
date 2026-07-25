'use client'

import * as React from 'react'
import { ErrorState } from '@/components/shared/states'
import { Button } from '@/components/ui/button'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mm-card">
      <ErrorState
        title="Halaman ini gagal dimuat"
        description={error.message || 'Terjadi kesalahan tak terduga. Coba muat ulang halaman.'}
        action={
          <Button onClick={reset} variant="secondary">
            Coba lagi
          </Button>
        }
      />
    </div>
  )
}
