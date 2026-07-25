import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
