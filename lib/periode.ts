import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  subMonths,
  differenceInCalendarDays,
  addDays,
  format,
} from 'date-fns'
import { todayJakarta } from './format'
import type { PeriodePreset } from './constants'

export type Rentang = {
  preset: PeriodePreset
  /** inklusif, format YYYY-MM-DD */
  from: string
  /** inklusif, format YYYY-MM-DD */
  to: string
  label: string
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd')

/**
 * Ubah query param periode jadi rentang tanggal konkret.
 * Dipakai dashboard, laporan, dan semua chart yang ikut filter global.
 */
export function resolvePeriode(params?: {
  periode?: string
  from?: string
  to?: string
  year?: string
}): Rentang {
  const hariIni = new Date(`${todayJakarta()}T00:00:00`)
  const preset = (params?.periode as PeriodePreset) || 'tahun-ini'

  if (preset === 'custom' && params?.from && params?.to) {
    return {
      preset: 'custom',
      from: params.from,
      to: params.to,
      label: 'Periode custom',
    }
  }

  if (preset === 'tahun') {
    const y = Number(params?.year) || hariIni.getFullYear()
    return {
      preset: 'tahun',
      from: `${y}-01-01`,
      to: `${y}-12-31`,
      label: `Tahun ${y}`,
    }
  }

  switch (preset) {
    case 'bulan-ini':
      return {
        preset,
        from: iso(startOfMonth(hariIni)),
        to: iso(endOfMonth(hariIni)),
        label: 'Bulan ini',
      }
    case '3-bulan':
      return {
        preset,
        from: iso(startOfMonth(subMonths(hariIni, 2))),
        to: iso(endOfMonth(hariIni)),
        label: '3 bulan terakhir',
      }
    case '6-bulan':
      return {
        preset,
        from: iso(startOfMonth(subMonths(hariIni, 5))),
        to: iso(endOfMonth(hariIni)),
        label: '6 bulan terakhir',
      }
    case 'tahun-ini':
    default:
      return {
        preset: 'tahun-ini',
        from: iso(startOfYear(hariIni)),
        to: iso(endOfMonth(hariIni)),
        label: 'Tahun ini',
      }
  }
}

/** Rentang dengan panjang sama tepat sebelum `r` — untuk perbandingan delta. */
export function periodeSebelumnya(r: Rentang): { from: string; to: string } {
  const from = new Date(`${r.from}T00:00:00`)
  const to = new Date(`${r.to}T00:00:00`)
  const panjang = differenceInCalendarDays(to, from) + 1
  return {
    from: iso(addDays(from, -panjang)),
    to: iso(addDays(from, -1)),
  }
}

/** Daftar bulan (YYYY-MM) dalam rentang, untuk sumbu chart. */
export function bulanDalamRentang(r: Rentang): string[] {
  const out: string[] = []
  let cur = startOfMonth(new Date(`${r.from}T00:00:00`))
  const akhir = startOfMonth(new Date(`${r.to}T00:00:00`))
  let guard = 0
  while (cur <= akhir && guard < 120) {
    out.push(format(cur, 'yyyy-MM'))
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    guard++
  }
  return out
}
