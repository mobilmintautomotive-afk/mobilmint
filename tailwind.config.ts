import type { Config } from 'tailwindcss'

/**
 * Semua warna di-map ke CSS variable yang didefinisikan di app/globals.css
 * (lihat PRD 04-uiux-design-admin.md bagian 1.1). Jangan pakai palet default
 * Tailwind (blue-500, gray-100, dst) langsung di komponen.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        page: 'var(--bg)',
        brand: 'var(--brand)',
        surface: {
          DEFAULT: 'var(--surface)',
          alt: 'var(--surface-alt)',
        },
        line: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        ink: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
          subtle: 'var(--text-subtle)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          soft: 'var(--accent-soft)',
        },
        cta: {
          DEFAULT: 'var(--cta)',
          hover: 'var(--cta-hover)',
        },
        success: {
          DEFAULT: 'var(--success)',
          soft: 'var(--success-soft)',
          deep: 'var(--success-deep)',
          deepsoft: 'var(--success-deep-soft)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          soft: 'var(--warning-soft)',
          deep: 'var(--warning-deep)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          soft: 'var(--danger-soft)',
        },
        neutral: {
          soft: 'var(--neutral-soft)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-sm)',
        md: 'var(--radius-sm)',
        lg: 'var(--radius)',
        xl: 'var(--radius-lg)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow)',
        lg: 'var(--shadow-lg)',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        metric: ['32px', { lineHeight: '1.15', fontWeight: '700' }],
        'metric-hero': ['40px', { lineHeight: '1.1', fontWeight: '700' }],
        'page-title': ['24px', { lineHeight: '1.25', fontWeight: '700' }],
        'card-title': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['14px', { lineHeight: '1.5' }],
        label: ['13px', { lineHeight: '1.45' }],
        caps: ['11px', { lineHeight: '1.4', letterSpacing: '0.06em', fontWeight: '600' }],
      },
      maxWidth: {
        app: '1440px',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-in': 'fade-in .18s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
