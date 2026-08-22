import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTanggal } from '@/lib/format'
import { CAR_STATUS, CAR_STATUS_LABEL, type CarStatus } from '@/lib/constants'

/**
 * Timeline siklus hidup unit: dibeli -> perbaikan -> ready -> terjual -> selesai.
 * Tahap yang sudah lewat ditandai centang; tahap berjalan diberi warna aksen.
 */
export function TimelineStatus({
  status,
  tanggalBeli,
  tanggalPerbaikanMulai,
  tanggalReady,
  tanggalBooking,
  tanggalJual,
  tanggalSelesai,
}: {
  status: CarStatus
  tanggalBeli?: string | null
  tanggalPerbaikanMulai?: string | null
  tanggalReady?: string | null
  tanggalBooking?: string | null
  tanggalJual?: string | null
  tanggalSelesai?: string | null
}) {
  const tanggal: Record<CarStatus, string | null | undefined> = {
    DIBELI: tanggalBeli,
    PERBAIKAN: tanggalPerbaikanMulai,
    READY_STOCK: tanggalReady,
    TERBOOKING: tanggalBooking,
    TERJUAL: tanggalJual,
    SELESAI: tanggalSelesai,
  }

  const indeksAktif = CAR_STATUS.indexOf(status)

  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:gap-0">
      {CAR_STATUS.map((s, i) => {
        const lewat = i < indeksAktif
        const aktif = i === indeksAktif
        const tgl = tanggal[s]

        return (
          <li key={s} className="relative flex flex-1 gap-3 sm:flex-col sm:gap-2">
            {/* garis penghubung */}
            {i < CAR_STATUS.length - 1 ? (
              <span
                className={cn(
                  'absolute left-[13px] top-7 h-[calc(100%-14px)] w-[2px] sm:left-auto sm:top-[13px] sm:h-[2px] sm:w-[calc(100%-28px)] sm:translate-x-7',
                  lewat ? 'bg-success' : 'bg-line',
                )}
                aria-hidden
              />
            ) : null}

            <span
              className={cn(
                'relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2 text-[11px] font-semibold',
                lewat && 'border-success bg-success text-white',
                aktif && 'border-accent bg-accent-soft text-accent',
                !lewat && !aktif && 'border-line bg-surface text-ink-subtle',
              )}
            >
              {lewat ? <Check className="size-4" strokeWidth={3} /> : i + 1}
            </span>

            <div className="pb-5 sm:pb-0">
              <p
                className={cn(
                  'text-label font-medium',
                  aktif ? 'text-accent' : lewat ? 'text-ink' : 'text-ink-subtle',
                )}
              >
                {CAR_STATUS_LABEL[s]}
              </p>
              <p className="text-label text-ink-subtle">{tgl ? formatTanggal(tgl) : '-'}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
