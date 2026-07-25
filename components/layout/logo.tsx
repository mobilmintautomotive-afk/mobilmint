import { cn } from '@/lib/utils'

/**
 * Wordmark MobilMint. Sengaja dirender sebagai teks (bukan file JPEG)
 * supaya tidak ada kotak putih di atas background abu dan tetap tajam
 * di semua ukuran layar. File logo asli tetap ada di /public untuk
 * kop laporan PDF dan favicon.
 *
 * Logo asli: huruf putih dengan ekstrusi 3D biru bertekstur kertas —
 * "Mobil" dan "Mint" satu warna solid, BUKAN dua warna berbeda.
 * Versi teks ini pakai satu warna brand (--brand, disampling langsung
 * dari file logo) untuk seluruh wordmark supaya konsisten dengan mark aslinya.
 */
export function Logo({
  size = 'md',
  compact = false,
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  /** hanya inisial — dipakai saat sidebar collapse */
  compact?: boolean
  className?: string
}) {
  if (compact) {
    return (
      <span
        className={cn(
          'grid shrink-0 place-items-center rounded-[10px] bg-brand font-bold italic text-white',
          size === 'sm' ? 'size-8 text-[14px]' : 'size-9 text-[15px]',
          className,
        )}
      >
        MM
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex select-none items-center font-bold italic tracking-tight text-brand',
        size === 'sm' && 'text-[16px]',
        size === 'md' && 'text-[19px]',
        size === 'lg' && 'text-[26px]',
        className,
      )}
    >
      MobilMint
    </span>
  )
}
