import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { id } from 'date-fns/locale'

/** Timezone aplikasi (PRD 03 bagian 5.7) */
export const APP_TIMEZONE = 'Asia/Jakarta'

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const angka = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

/**
 * `Rp 125.000.000`. Nilai negatif ditulis `-Rp 5.000.000`,
 * bukan `(Rp 5.000.000)` (PRD 04 bagian 2.5).
 */
export function formatRupiah(value: number | string | null | undefined): string {
  const n = toNumber(value)
  const abs = rupiah.format(Math.abs(n)).replace(/\s/g, ' ')
  return n < 0 ? `-${abs}` : abs
}

/** Versi singkat untuk sumbu chart: `120 jt`, `1,2 M`. */
export function formatRupiahSingkat(value: number | string | null | undefined): string {
  const n = toNumber(value)
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}${trimDecimal(abs / 1_000_000_000)} M`
  if (abs >= 1_000_000) return `${sign}${trimDecimal(abs / 1_000_000)} jt`
  if (abs >= 1_000) return `${sign}${trimDecimal(abs / 1_000)} rb`
  return `${sign}${angka.format(abs)}`
}

function trimDecimal(n: number) {
  const rounded = Math.round(n * 10) / 10
  return angkaDesimal(rounded)
}

function angkaDesimal(n: number) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(n)
}

export function formatAngka(value: number | string | null | undefined): string {
  return angka.format(toNumber(value))
}

export function formatPersen(value: number | string | null | undefined, digits = 1): string {
  const n = toNumber(value)
  return `${new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(n)}%`
}

/** `12 Jan 2026` */
export function formatTanggal(value: string | Date | null | undefined): string {
  const d = toDate(value)
  if (!d) return '-'
  return format(d, 'd MMM yyyy', { locale: id })
}

/** `12 Januari 2026` — dipakai di kop laporan & PDF */
export function formatTanggalPanjang(value: string | Date | null | undefined): string {
  const d = toDate(value)
  if (!d) return '-'
  return format(d, 'd MMMM yyyy', { locale: id })
}

/** `Jan 2026` — label sumbu chart bulanan */
export function formatBulan(value: string | Date | null | undefined): string {
  const d = toDate(value)
  if (!d) return '-'
  return format(d, 'MMM yy', { locale: id })
}

/** `2026-01-12` — untuk value input date & query database */
export function toISODate(value: string | Date | null | undefined): string {
  const d = toDate(value)
  if (!d) return ''
  return format(d, 'yyyy-MM-dd')
}

/** Tanggal "hari ini" menurut zona Asia/Jakarta, bukan UTC. */
export function todayJakarta(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  return parts // en-CA => YYYY-MM-DD
}

export function umurHari(from: string | Date | null | undefined): number | null {
  const d = toDate(from)
  if (!d) return null
  return differenceInCalendarDays(new Date(`${todayJakarta()}T00:00:00`), d)
}

export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  // date-only string diperlakukan sebagai waktu lokal supaya tidak mundur 1 hari
  const s = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value
  try {
    const d = s.includes('T') ? new Date(s) : parseISO(s)
    return Number.isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

/** Ubah teks input uang (`125.000.000` / `Rp 125.000.000`) jadi angka. */
export function parseRupiahInput(text: string): number {
  const cleaned = text.replace(/[^\d-]/g, '')
  if (!cleaned || cleaned === '-') return 0
  return Number(cleaned)
}

/** Tampilkan angka dengan pemisah ribuan untuk input uang. */
export function formatRupiahInput(value: number | string | null | undefined): string {
  const n = toNumber(value)
  if (n === 0) return ''
  return angka.format(n)
}

export function inisial(nama: string | null | undefined): string {
  if (!nama) return '?'
  return nama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}
