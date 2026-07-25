import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { EmptyState } from '@/components/shared/states'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="mm-card">
      <EmptyState
        icon={SearchX}
        title="Data tidak ditemukan"
        description="Halaman atau data yang Anda cari tidak ada, mungkin sudah dihapus."
        action={
          <Button asChild>
            <Link href="/dashboard">Kembali ke Dashboard</Link>
          </Button>
        }
      />
    </div>
  )
}
