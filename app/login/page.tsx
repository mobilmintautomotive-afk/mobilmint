import type { Metadata } from 'next'
import Image from 'next/image'
import { BadgeCheck, ShieldCheck, TrendingUp } from 'lucide-react'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Masuk' }

const KEUNGGULAN = [
  { icon: ShieldCheck, title: 'Mobil Terpilih', desc: 'Kualitas terjaga' },
  { icon: TrendingUp, title: 'Investasi Transparan', desc: 'Pantau performa real-time' },
  { icon: BadgeCheck, title: 'Aman & Terpercaya', desc: '#SudahPastiAman' },
]

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <div
        className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand p-10 lg:flex xl:p-14"
        style={{
          backgroundImage:
            "linear-gradient(165deg, rgba(0,55,102,0.82) 0%, rgba(0,110,173,0.55) 55%, rgba(56,169,224,0.35) 100%), url('/login-showroom.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Image
          src="/logo-mobilmint-white.png"
          alt="MobilMint"
          width={220}
          height={220}
          className="h-32 w-32 shrink-0 self-start drop-shadow-md xl:h-40 xl:w-40"
          priority
        />

        <div className="space-y-7">
          <div className="space-y-2">
            <h1 className="text-[40px] font-bold leading-[1.1] text-white xl:text-[44px]">
              Mobil Second,
              <br />
              Kondisi Seger.
            </h1>
            <p className="text-[18px] font-semibold tracking-wide text-white/90">
              BERGARANSI MESIN &amp; MATIC
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {KEUNGGULAN.map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-2.5 rounded-xl bg-white/10 p-3 backdrop-blur-sm"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/15">
                  <f.icon className="size-4 text-white" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-tight text-white">{f.title}</p>
                  <p className="mt-0.5 text-[12px] leading-tight text-white/75">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-surface px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <Image
              src="/logo-mobilmint.jpeg"
              alt="MobilMint"
              width={140}
              height={140}
              className="h-12 w-auto"
              priority
            />
          </div>

          <h2 className="text-[28px] font-bold text-ink">Masuk ke MobilMint</h2>
          <p className="mt-1 text-body text-ink-muted">Kelola data &amp; pantau investasi Anda</p>

          <div className="mt-8">
            <LoginForm />
          </div>

          <p className="mt-10 text-center text-label text-ink-subtle">
            © {new Date().getFullYear()} MobilMint. Semua hak dilindungi.
            <br />
            Versi 1.0.0
          </p>
        </div>
      </div>
    </div>
  )
}
