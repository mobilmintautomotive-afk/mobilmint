-- =====================================================================
-- MobilMint — Migration 003: Aset Perusahaan (fixed assets)
--
-- Aset perusahaan (meja, laptop, AC showroom, kendaraan operasional, dll)
-- SENGAJA tidak memotong saldo investor — dicatat sebagai pengeluaran
-- milik pengelola, sama seperti operational_expenses. Investor mendanai
-- jual-beli mobil (barang dagangan), bukan aset tetap kantor.
-- =====================================================================

create table if not exists company_assets (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kategori text not null,                    -- Peralatan Kantor / Kendaraan Operasional / Elektronik / Furnitur / Lainnya
  tanggal_beli date not null,
  harga_beli numeric(18,2) not null check (harga_beli >= 0),
  umur_manfaat_bulan int,                    -- null = tidak disusutkan (nilai buku = harga beli terus)
  nilai_residu numeric(18,2) not null default 0 check (nilai_residu >= 0),
  status text not null default 'AKTIF' check (status in ('AKTIF','DIJUAL','DIHAPUS')),
  catatan text,
  created_at timestamptz not null default now()
);
create index if not exists idx_assets_status on company_assets(status);

-- Nilai buku per aset — penyusutan garis lurus per bulan berjalan.
-- umur_manfaat_bulan null/0 -> tidak disusutkan, nilai buku = harga beli.
create or replace view v_asset_book_value as
select
  x.*,
  x.harga_beli - x.akumulasi_penyusutan as nilai_buku
from (
  select
    a.*,
    case
      when a.umur_manfaat_bulan is null or a.umur_manfaat_bulan <= 0 then 0::numeric
      else least(
        a.harga_beli - a.nilai_residu,
        round(
          (a.harga_beli - a.nilai_residu)
          * greatest(0, (
              extract(year from age(current_date, a.tanggal_beli))::int * 12
              + extract(month from age(current_date, a.tanggal_beli))::int
            ))
          / a.umur_manfaat_bulan
        )
      )
    end as akumulasi_penyusutan
  from company_assets a
) x;
