-- =====================================================================
-- MobilMint — Migration: tabel bookings (DP / uang muka sebelum pelunasan)
--
-- Alur: unit Ready Stock -> Booking Baru (catat DP, unit jadi TERBOOKING)
-- -> Lunasi (jadi penjualan penuh via car_sales seperti biasa, modal &
-- bagi hasil investor diproses otomatis) ATAU Batalkan (unit balik lagi
-- ke Ready Stock).
-- =====================================================================

create table bookings (
  id uuid primary key default gen_random_uuid(),
  no_booking text not null unique,
  car_id uuid not null references cars(id) on delete restrict,
  customer_id uuid references customers(id) on delete set null,
  sales_person_id uuid references sales_persons(id) on delete set null,
  tanggal_booking date not null,
  harga_sepakat numeric(18,2) not null check (harga_sepakat > 0),
  dp_amount numeric(18,2) not null default 0 check (dp_amount >= 0),
  metode_bayar text not null default 'TRANSFER',
  catatan text,
  status text not null default 'AKTIF' check (status in ('AKTIF', 'SELESAI', 'BATAL')),
  car_sale_id uuid references car_sales(id) on delete set null,
  created_at timestamptz not null default now()
);

create index bookings_car_id_idx on bookings(car_id);
create index bookings_status_idx on bookings(status);

-- ---------------------------------------------------------------------
-- Daftarkan prefix 'BOK' di fungsi penomoran dokumen yang sudah ada.
-- ---------------------------------------------------------------------
create or replace function fn_next_doc_number(p_prefix text, p_date date default current_date)
returns text
language plpgsql
as $$
declare
  v_period text := to_char(p_date, 'YYYYMM');
  v_max int := 0;
  v_col text;
  v_tbl text;
  v_sql text;
begin
  case p_prefix
    when 'AKD' then v_tbl := 'investor_contracts'; v_col := 'no_akad';
    when 'BLI' then v_tbl := 'purchases';          v_col := 'no_transaksi';
    when 'JUL' then v_tbl := 'car_sales';          v_col := 'no_transaksi';
    when 'BGH' then v_tbl := 'profit_sharings';    v_col := 'no_transaksi';
    when 'BOK' then v_tbl := 'bookings';           v_col := 'no_booking';
    else raise exception 'Prefix dokumen tidak dikenal: %', p_prefix;
  end case;

  v_sql := format(
    'select coalesce(max((split_part(%I, ''-'', 3))::int), 0) from %I where %I like $1',
    v_col, v_tbl, v_col
  );
  execute v_sql into v_max using p_prefix || '-' || v_period || '-%';

  return p_prefix || '-' || v_period || '-' || lpad((v_max + 1)::text, 4, '0');
end;
$$;

-- ---------------------------------------------------------------------
-- Unit TERBOOKING masih menghitung sebagai "modal tertanam di stok" dan
-- masih punya umur stok — modalnya belum kembali sampai benar-benar lunas
-- dan diproses jadi penjualan.
-- ---------------------------------------------------------------------
create or replace view v_dashboard_summary as
select
  (select count(*) from investors where is_active) as jumlah_investor,
  (select coalesce(sum(nilai_investasi),0) from investor_contracts where status = 'AKTIF') as total_investasi,
  (select coalesce(sum(saldo),0) from v_investor_balance) as total_saldo,
  (select count(*) from cars where status in ('TERJUAL','SELESAI')) as total_unit_terjual,
  (select count(*) from cars where status = 'READY_STOCK') as total_unit_available,
  (select coalesce(sum(h.hpp),0) from cars c join v_car_hpp h on h.car_id = c.id
     where c.status in ('DIBELI','PERBAIKAN','READY_STOCK','TERBOOKING')) as total_modal_available,
  (select coalesce(sum(laba_bersih),0) from car_sales) as total_laba_bersih,
  (select coalesce(sum(porsi_investor),0) from profit_sharings where not is_reversed) as total_bagi_hasil;

create or replace view v_car_overview as
select
  c.*,
  h.modal_pembelian,
  h.total_perbaikan,
  h.hpp,
  p.id            as purchase_id,
  p.no_transaksi  as no_pembelian,
  p.tanggal_beli,
  p.supplier_id,
  s.nama          as supplier_nama,
  cs.id           as sale_id,
  cs.tanggal_jual,
  cs.harga_jual,
  cs.laba_bersih,
  cs.is_profit_shared,
  case
    when c.status in ('DIBELI','PERBAIKAN','READY_STOCK','TERBOOKING') and p.tanggal_beli is not null
      then (current_date - p.tanggal_beli)
    else null
  end as umur_stok_hari
from cars c
left join v_car_hpp h on h.car_id = c.id
left join purchases p on p.car_id = c.id
left join suppliers s on s.id = p.supplier_id
left join car_sales cs on cs.car_id = c.id;
