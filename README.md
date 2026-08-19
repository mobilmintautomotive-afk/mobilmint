# MobilMint

Aplikasi manajemen bisnis jual beli mobil berbasis investor — dari akad investor,
pembelian unit, perbaikan, penjualan, sampai bagi hasil, dengan dashboard terpisah
untuk pengelola (holding) dan tiap investor.

Dibangun mengikuti PRD di `../PRD/`. Fase 1–4 sudah jalan; Fase 5 (auth & RLS)
sudah disiapkan tapi belum diaktifkan.

---

## Cara menjalankan

### 1. Siapkan project Supabase

1. Buat project baru di [supabase.com](https://supabase.com) — pilih region **Singapore**.
2. Buka **SQL Editor**, jalankan berurutan:
   - `supabase/migrations/20260724000100_init.sql` (enum, tabel, index, trigger)
   - `supabase/migrations/20260724000200_views_functions.sql` (view + function keuangan)
   - `supabase/seed.sql` (data contoh — **jangan** dijalankan di produksi)
3. Buka **Storage**, buat dua bucket:
   - `car-photos` — public read (foto unit)
   - `documents` — private (dokumen akad & bukti transfer)

### 2. Isi environment

```bash
cp .env.local.example .env.local
```

Isi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan
`SUPABASE_SERVICE_ROLE_KEY` dari **Project Settings → API**.

> `SUPABASE_SERVICE_ROLE_KEY` tidak boleh diberi prefix `NEXT_PUBLIC_`.
> Key ini melewati semua RLS dan hanya boleh dipakai di server.

### 3. Jalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000

---

## Mode development: belum ada login

Selama Fase 1–4 **tidak ada halaman login**. Sebagai gantinya ada **Role Switcher**
di pojok kanan atas navbar untuk berpindah antara `Admin`, `Holding`, dan
`Investor — <nama>`.

Semua pengecekan akses memanggil `lib/dev-role.ts`, bukan Supabase Auth langsung.
Di Fase 5 cukup ganti isi file itu (lihat PRD 05 bagian 1.3), sisa aplikasi tidak
perlu disentuh, lalu hapus komponen `RoleSwitcher` dari navbar.

---

## Alur kerja aplikasi

```
Master (golongan, investor, supplier, vendor, sales, customer)
  → Akad Investor        → konfirmasi dana → saldo investor naik
  → Pembelian Mobil      → data unit diinput di sini (bukan Master Mobil
                           terpisah) + alokasi modal proporsional
                         → saldo turun, unit DIBELI
  → Perbaikan (opsional) → biaya masuk ke HPP unit
  → Tandai Siap Jual     → unit READY_STOCK
  → Penjualan            → laba bersih terhitung, unit TERJUAL
  → Bagi Hasil           → modal kembali + bagi hasil ke saldo, unit SELESAI
  → Laporan Laba Rugi    → export PDF & Excel
```

Di luar siklus unit ada **Biaya Operasional** (`/transaksi/biaya`) untuk biaya jalannya
usaha: gaji, sewa showroom, listrik, marketing. Ini berbeda dari biaya perbaikan —
perbaikan menempel ke HPP unit tertentu, biaya operasional hanya memotong laba pengelola
di laporan laba rugi.

---

## Aturan yang dipegang di codebase

1. **Saldo investor tidak pernah di-UPDATE.** Saldo selalu `SUM(investor_ledger.amount)`.
   Perubahan saldo hanya lewat INSERT entri ledger.
2. **Semua rumus keuangan terpusat** di `lib/calc.ts` (preview di UI) dan Postgres
   function (eksekusi final). Tidak ada perhitungan laba yang ditulis ulang di komponen.
3. **Operasi multi-langkah bersifat atomik.** Alokasi modal dan bagi hasil dijalankan
   lewat function database (`allocate_purchase_funding`, `process_profit_sharing`)
   supaya tidak pernah ada entri ledger setengah jadi.
4. **Snapshot, bukan join.** Nilai investasi, nisbah, dan HPP disalin ke tabel transaksi
   saat transaksi dibuat — mengubah golongan tidak mengubah transaksi lama.
5. **Angka minus tidak di-clamp.** Unit rugi menghasilkan bagi hasil negatif dan modal
   kembali yang lebih kecil dari modal awal.
6. **Bagi hasil tidak bisa dihapus**, hanya dibatalkan lewat entri ledger pembalik
   supaya audit trail tetap utuh.
7. **Semua warna lewat CSS variable** di `app/globals.css` — tidak ada palet default
   Tailwind (`blue-500`, dst) yang dipakai langsung di komponen.

---

## Struktur folder

```
app/
  (app)/            # layout aplikasi (sidebar + navbar) + semua halaman internal
    dashboard/      # dashboard holding
    investor/       # dashboard investor, unit saya, mutasi saldo
    master/         # CRUD master data
    transaksi/      # akad, pembelian, perbaikan, stock, penjualan, bagi hasil
    laporan/        # laba rugi
    admin/          # kelola akses & pengaturan
  actions/          # server actions (semua mutasi data lewat sini)
  api/export/pdf/   # generator PDF laporan
components/
  ui/               # primitif (button, input, dialog, select, ...)
  shared/           # data-table, metric-card, money, status-badge, empty-state, ...
  charts/           # sales-trend & waterfall (Recharts)
  forms/            # kerangka form dialog, rincian biaya, upload foto
  master/ transaksi/ laporan/ investor/ admin/   # komponen per fitur
  pdf/              # dokumen @react-pdf/renderer
lib/
  calc.ts           # SEMUA rumus keuangan
  format.ts         # formatRupiah, formatTanggal, timezone Asia/Jakarta
  dev-role.ts       # role dummy Fase 1–4 → diganti di Fase 5
  periode.ts        # resolusi filter periode global
  queries/          # pengambilan data server-side
  validations/      # skema Zod (pesan error bahasa Indonesia)
  supabase/         # client browser / server / service-role
supabase/
  migrations/       # skema + view + function
  seed.sql          # data contoh
  fase5/rls.sql     # Row Level Security — baru dijalankan di Fase 5
```

---

## Yang belum dikerjakan (Fase 5)

- Halaman login, lupa/reset password, callback OAuth, set password undangan
- `middleware.ts` proteksi route per role
- Mengaktifkan RLS (`supabase/fase5/rls.sql`)
- Menyambungkan Kelola Akses ke `supabase.auth.admin.inviteUserByEmail`

Checklist testing sebelum launch ada di PRD `05-auth-payment-deploy.md` bagian 4.
