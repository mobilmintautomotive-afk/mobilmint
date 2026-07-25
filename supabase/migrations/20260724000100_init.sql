-- =====================================================================
-- MobilMint — Migration 001: Enum, Tabel, Index, Trigger
-- Fase 3 (PRD 03-tech-stack-data-model.md)
-- Catatan: RLS sengaja BELUM diaktifkan di fase ini. Lihat migration 003.
-- =====================================================================

create extension if not exists "pgcrypto";
create schema if not exists extensions;
create extension if not exists moddatetime schema extensions;

-- ---------------------------------------------------------------------
-- 1. ENUM
-- ---------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('admin', 'holding', 'investor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type car_status as enum ('DIBELI', 'PERBAIKAN', 'READY_STOCK', 'TERJUAL', 'SELESAI');
exception when duplicate_object then null; end $$;

do $$ begin
  create type supplier_type as enum ('LELANG', 'MEDIATOR', 'FOLLOWERS');
exception when duplicate_object then null; end $$;

do $$ begin
  create type vendor_type as enum ('BENGKEL', 'SALON', 'SPARE_PART', 'BODY_REPAIR', 'LAINNYA');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contract_status as enum ('MENUNGGU_DANA', 'AKTIF', 'SELESAI', 'BATAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ledger_type as enum ('SETORAN', 'ALOKASI_MODAL', 'PENGEMBALIAN_MODAL', 'BAGI_HASIL', 'PENARIKAN', 'PENYESUAIAN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type repair_status as enum ('PROSES', 'SELESAI');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('TUNAI', 'TRANSFER', 'KREDIT');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. MASTER
-- ---------------------------------------------------------------------
create table if not exists investors (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  alamat text,
  no_tlp text,
  email text,
  no_ktp text,
  nama_bank text,
  no_rekening text,
  atas_nama_rekening text,
  catatan text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,                  -- diisi di Fase 5, nullable dulu
  nama text not null,
  email text unique not null,
  role user_role not null default 'investor',
  investor_id uuid,                          -- FK ke investors, hanya untuk role investor
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

do $$ begin
  alter table profiles add constraint fk_profiles_investor
    foreign key (investor_id) references investors(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists investment_tiers (          -- Golongan Investasi
  id uuid primary key default gen_random_uuid(),
  nama_golongan text not null unique,
  nilai_investasi numeric(18,2) not null check (nilai_investasi > 0),
  nisbah_investor_pct numeric(5,2) not null check (nisbah_investor_pct between 0 and 100),
  nisbah_pengelola_pct numeric(5,2) not null check (nisbah_pengelola_pct between 0 and 100),
  tenor_bulan int,
  deskripsi text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint nisbah_total_100 check (nisbah_investor_pct + nisbah_pengelola_pct = 100)
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  alamat text,
  no_tlp text,
  tipe_supplier supplier_type not null,
  catatan text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  alamat text,
  no_tlp text,
  tipe_vendor vendor_type not null,
  catatan text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists sales_persons (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  alamat text,
  no_tlp text,
  komisi_default numeric(18,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  alamat text,
  no_tlp text,
  no_ktp text,
  catatan text,
  created_at timestamptz not null default now()
);

create table if not exists cars (
  id uuid primary key default gen_random_uuid(),
  merek text not null,
  tipe text not null,
  tahun int not null,
  warna text,
  no_polisi text,
  no_rangka text,
  no_mesin text,
  transmisi text,                            -- 'MANUAL' | 'MATIC'
  kilometer int,
  tanggal_pajak date,                        -- masa berlaku STNK
  status car_status not null default 'DIBELI',
  foto_urls text[] default '{}',
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. TRANSAKSI
-- ---------------------------------------------------------------------
create table if not exists investor_contracts (
  id uuid primary key default gen_random_uuid(),
  no_akad text unique not null,              -- AKD-YYYYMM-0001
  investor_id uuid not null references investors(id) on delete restrict,
  tier_id uuid not null references investment_tiers(id) on delete restrict,
  nilai_investasi numeric(18,2) not null,    -- snapshot dari tier saat akad
  nisbah_investor_pct numeric(5,2) not null, -- snapshot, jangan join ke tier saat hitung
  nisbah_pengelola_pct numeric(5,2) not null,
  tenor_bulan int,
  tanggal_akad date not null,
  tanggal_dana_diterima date,
  jumlah_diterima numeric(18,2),
  dokumen_url text,
  bukti_transfer_url text,
  status contract_status not null default 'MENUNGGU_DANA',
  catatan text,
  created_at timestamptz not null default now()
);

-- Buku besar saldo investor — SUMBER KEBENARAN SALDO
create table if not exists investor_ledger (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references investors(id) on delete restrict,
  contract_id uuid references investor_contracts(id) on delete set null,
  tipe ledger_type not null,
  amount numeric(18,2) not null,             -- POSITIF = masuk, NEGATIF = keluar
  keterangan text not null,                  -- bahasa awam, tampil di dashboard investor
  ref_table text,
  ref_id uuid,
  tanggal date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists idx_ledger_investor on investor_ledger(investor_id, tanggal);
create index if not exists idx_ledger_ref on investor_ledger(ref_table, ref_id);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  no_transaksi text unique not null,         -- BLI-YYYYMM-0001
  car_id uuid not null unique references cars(id) on delete restrict,
  supplier_id uuid references suppliers(id) on delete set null,
  tanggal_beli date not null,
  harga_beli numeric(18,2) not null check (harga_beli >= 0),
  biaya_lain numeric(18,2) not null default 0,
  rincian_biaya_lain jsonb default '[]',     -- [{"nama":"Biaya lelang","nominal":2000000}]
  total_modal numeric(18,2) generated always as (harga_beli + biaya_lain) stored,
  catatan text,
  created_at timestamptz not null default now()
);
create index if not exists idx_purchases_car on purchases(car_id);

-- Snapshot alokasi modal investor per unit — DASAR PERHITUNGAN BAGI HASIL
create table if not exists car_fundings (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references cars(id) on delete cascade,
  purchase_id uuid not null references purchases(id) on delete cascade,
  investor_id uuid not null references investors(id) on delete restrict,
  contract_id uuid references investor_contracts(id) on delete set null,
  amount numeric(18,2) not null check (amount > 0),
  porsi_pct numeric(7,4) not null,           -- 4 desimal supaya presisi
  nisbah_investor_pct numeric(5,2) not null, -- snapshot nisbah investor saat itu
  created_at timestamptz not null default now(),
  unique (car_id, investor_id)
);
create index if not exists idx_fundings_car on car_fundings(car_id);
create index if not exists idx_fundings_investor on car_fundings(investor_id);

create table if not exists repairs (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references cars(id) on delete cascade,
  vendor_id uuid references vendors(id) on delete set null,
  jenis_perbaikan text not null,             -- Mesin/Body/Interior/Kaki-kaki/Salon/Lainnya
  deskripsi text,
  biaya numeric(18,2) not null default 0 check (biaya >= 0),
  tanggal_masuk date not null,
  tanggal_selesai date,
  status repair_status not null default 'PROSES',
  ambil_dari_modal boolean not null default false,
  foto_sebelum text[] default '{}',
  foto_sesudah text[] default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_repairs_car on repairs(car_id);

create table if not exists car_sales (
  id uuid primary key default gen_random_uuid(),
  no_transaksi text unique not null,         -- JUL-YYYYMM-0001
  car_id uuid not null unique references cars(id) on delete restrict,
  customer_id uuid references customers(id) on delete set null,
  sales_person_id uuid references sales_persons(id) on delete set null,
  tanggal_jual date not null,
  harga_jual numeric(18,2) not null check (harga_jual >= 0),
  komisi_sales numeric(18,2) not null default 0,
  biaya_lain numeric(18,2) not null default 0,
  rincian_biaya_lain jsonb default '[]',
  hpp_snapshot numeric(18,2) not null,       -- HPP dikunci saat penjualan disimpan
  laba_kotor numeric(18,2) not null,
  laba_bersih numeric(18,2) not null,
  metode_bayar payment_method not null default 'TRANSFER',
  is_profit_shared boolean not null default false,
  catatan text,
  created_at timestamptz not null default now()
);
create index if not exists idx_sales_tanggal on car_sales(tanggal_jual);

create table if not exists profit_sharings (
  id uuid primary key default gen_random_uuid(),
  no_transaksi text unique not null,         -- BGH-YYYYMM-0001
  car_sale_id uuid not null unique references car_sales(id) on delete restrict,
  car_id uuid not null references cars(id) on delete restrict,
  laba_bersih numeric(18,2) not null,
  porsi_investor numeric(18,2) not null,
  porsi_pengelola numeric(18,2) not null,
  tanggal_proses date not null default current_date,
  is_reversed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists profit_sharing_details (
  id uuid primary key default gen_random_uuid(),
  profit_sharing_id uuid not null references profit_sharings(id) on delete cascade,
  investor_id uuid not null references investors(id) on delete restrict,
  modal_awal numeric(18,2) not null,
  porsi_pct numeric(7,4) not null,
  bagi_hasil numeric(18,2) not null,         -- bisa negatif kalau unit rugi
  modal_kembali numeric(18,2) not null,
  total_kembali numeric(18,2) not null,
  sudah_ditransfer boolean not null default false
);
create index if not exists idx_psd_investor on profit_sharing_details(investor_id);

create table if not exists operational_expenses (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  kategori text not null,                    -- Gaji, Sewa, Listrik, Marketing, Lainnya
  keterangan text,
  nominal numeric(18,2) not null check (nominal >= 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_opex_tanggal on operational_expenses(tanggal);

-- Pengaturan aplikasi (single row) — dipakai kop laporan PDF & ambang umur stok
create table if not exists app_settings (
  id int primary key default 1 check (id = 1),
  nama_perusahaan text not null default 'MobilMint',
  logo_url text,
  alamat text,
  no_tlp text,
  default_nisbah_pengelola numeric(5,2) not null default 35,
  ambang_umur_stok int not null default 60,
  updated_at timestamptz not null default now()
);
insert into app_settings (id) values (1) on conflict (id) do nothing;

create index if not exists idx_cars_status on cars(status);

-- ---------------------------------------------------------------------
-- 4. TRIGGER updated_at
-- ---------------------------------------------------------------------
drop trigger if exists handle_updated_at on cars;
create trigger handle_updated_at before update on cars
  for each row execute procedure extensions.moddatetime (updated_at);

drop trigger if exists handle_updated_at on app_settings;
create trigger handle_updated_at before update on app_settings
  for each row execute procedure extensions.moddatetime (updated_at);
