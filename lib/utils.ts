import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * tailwind-merge perlu diberi tahu nama fontSize kustom kita (lihat
 * `fontSize` di tailwind.config.ts). Tanpa ini `text-body` dianggap satu
 * kelompok dengan `text-white`, sehingga salah satunya dibuang diam-diam —
 * itu yang bikin tombol primary sempat tampil tanpa teks (warna teks ikut
 * warna latar).
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'metric',
            'metric-hero',
            'page-title',
            'card-title',
            'body',
            'label',
            'caps',
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Ambil pesan error yang aman ditampilkan ke user (bahasa Indonesia). */
export function errorMessage(e: unknown, fallback = 'Terjadi kesalahan. Coba lagi.') {
  if (e instanceof Error && e.message) return e.message
  if (typeof e === 'string' && e) return e
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message
    if (typeof m === 'string' && m) return m
  }
  return fallback
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
