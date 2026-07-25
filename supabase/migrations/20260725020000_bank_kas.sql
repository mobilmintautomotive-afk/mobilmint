-- =====================================================================
-- MobilMint — Migration 005: Akun Bank & Buku Kas
--
-- Sampai sebelum ini tidak ada pencatatan kas sama sekali: `investor_ledger`
-- mencatat KLAIM investor atas pool, bukan uang fisik. Akibatnya porsi
-- pengelola cuma jadi angka hitungan yang tidak pernah "mendarat" di mana pun.
--
-- Migration ini menambahkan buku kas riil supaya saldo di aplikasi bisa
-- dicocokkan dengan rekening koran asli.
--
-- ATURAN PENTING — kapan kas bergerak:
--   Kas HANYA berubah saat uang fisik berpindah. Mutasi yang sifatnya
--   perpindahan KLAIM (ALOKASI_MODAL, PENGEMBALIAN_MODAL, BAGI_HASIL di
--   investor_ledger) TIDAK menyentuh kas — kalau ikut dicatat, uangnya
--   terhitung dua kali.
--
--   Masuk : setoran investor, hasil penjualan unit
--   Keluar: pembelian unit, perbaikan, komisi & biaya penjualan,
--           biaya operasional, pembelian aset, penarikan investor,
--           prive (pencairan hak pengelola)
--
-- Pencatatan otomatis memakai TRIGGER, bukan dipanggil dari server action,
-- supaya edit & hapus data ikut menyesuaikan saldo kas dengan sendirinya.
-- =====================================================================

do $$ begin
  create type cash_type as enum (
    'SETORAN_INVESTOR',
    'PENARIKAN_INVESTOR',
    'PEMBELIAN_UNIT',
    'PERBAIKAN',
    'PENJUALAN_UNIT',
    'BIAYA_PENJUALAN',
    'BIAYA_OPERASIONAL',
    'PEMBELIAN_ASET',
    'SETOR_MODAL_PENGELOLA',
    'PRIVE_PENGELOLA',
    'TRANSFER_MASUK',
    'TRANSFER_KELUAR',
    'PENYESUAIAN'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 1. TABEL
-- ---------------------------------------------------------------------

create table if not exists bank_accounts (
  id uuid primary key default gen_random_uuid(),
  nama text not null,                        -- label internal, mis. "BCA Operasional"
  nama_bank text not null,
  no_rekening text not null,
  atas_nama text not null,
  saldo_awal numeric(18,2) not null default 0,
  tanggal_saldo_awal date not null default current_date,
  is_default boolean not null default false, -- penerima semua pencatatan otomatis
  is_active boolean not null default true,
  catatan text,
  created_at timestamptz not null default now()
);

-- Hanya boleh ada satu rekening default.
create unique index if not exists idx_bank_default
  on bank_accounts(is_default) where is_default;

create table if not exists cash_ledger (
  id uuid primary key default gen_random_uuid(),
  bank_account_id uuid not null references bank_accounts(id) on delete restrict,
  tanggal date not null default current_date,
  tipe cash_type not null,
  amount numeric(18,2) not null,             -- POSITIF = masuk, NEGATIF = keluar
  keterangan text not null,
  ref_table text,
  ref_id uuid,
  is_auto boolean not null default false,    -- true = hasil trigger, jangan diedit manual
  created_at timestamptz not null default now()
);
create index if not exists idx_cash_bank on cash_ledger(bank_account_id, tanggal);
create index if not exists idx_cash_ref on cash_ledger(ref_table, ref_id);
create index if not exists idx_cash_tipe on cash_ledger(tipe);

-- ---------------------------------------------------------------------
-- 2. VIEW
-- ---------------------------------------------------------------------

create or replace view v_bank_balance as
select
  b.id as bank_account_id,
  b.nama,
  b.nama_bank,
  b.no_rekening,
  b.atas_nama,
  b.saldo_awal,
  b.tanggal_saldo_awal,
  b.is_default,
  b.is_active,
  b.saldo_awal + coalesce(sum(l.amount), 0) as saldo,
  coalesce(sum(l.amount) filter (where l.amount > 0), 0) as total_masuk,
  coalesce(-sum(l.amount) filter (where l.amount < 0), 0) as total_keluar
from bank_accounts b
left join cash_ledger l on l.bank_account_id = b.id
group by b.id;

/*
 * Hak pengelola yang boleh dicairkan ke rekening pribadi.
 *
 * Pengelola menanggung operasional dealer (gaji, sewa, listrik) dan
 * pembelian aset kantor, jadi keduanya mengurangi hak yang bisa ditarik.
 * Biaya per-unit (perbaikan, komisi sales) TIDAK dikurangkan di sini karena
 * sudah menempel di HPP dan ikut mengecilkan laba_bersih sebelum dibagi.
 */
create or replace view v_hak_pengelola as
select
  (select coalesce(sum(porsi_pengelola), 0) from profit_sharings where not is_reversed)
    as porsi_bagi_hasil,
  (select coalesce(sum(nominal), 0) from operational_expenses)
    as biaya_operasional,
  (select coalesce(sum(harga_beli), 0) from company_assets where status <> 'DIHAPUS')
    as pembelian_aset,
  (select coalesce(-sum(amount), 0) from cash_ledger where tipe = 'PRIVE_PENGELOLA')
    as sudah_dicairkan,
  (select coalesce(sum(amount), 0) from cash_ledger where tipe = 'SETOR_MODAL_PENGELOLA')
    as modal_disetor;

-- ---------------------------------------------------------------------
-- 3. HELPER
-- ---------------------------------------------------------------------

/* Rekening penerima semua pencatatan otomatis. */
create or replace function fn_bank_default()
returns uuid
language sql
stable
as $$
  select id from bank_accounts
  where is_active
  order by is_default desc, created_at asc
  limit 1;
$$;

/*
 * Tulis-ulang satu baris kas otomatis untuk (ref_table, ref_id, tipe).
 * Idempoten: dipanggil ulang saat data diedit akan menimpa, bukan menumpuk.
 *
 * Kalau belum ada rekening sama sekali, fungsi ini diam saja — transaksi
 * operasional tidak boleh gagal cuma karena master rekening belum diisi.
 * Jalankan fn_backfill_cash() setelah rekening dibuat untuk menyusulkan.
 */
create or replace function fn_sync_cash(
  p_ref_table text,
  p_ref_id uuid,
  p_tipe cash_type,
  p_tanggal date,
  p_amount numeric,
  p_keterangan text
)
returns void
language plpgsql
as $$
declare
  v_bank uuid;
begin
  delete from cash_ledger
  where is_auto and ref_table = p_ref_table and ref_id = p_ref_id and tipe = p_tipe;

  if p_amount is null or p_amount = 0 then
    return;
  end if;

  v_bank := fn_bank_default();
  if v_bank is null then
    return;
  end if;

  insert into cash_ledger (
    bank_account_id, tanggal, tipe, amount, keterangan, ref_table, ref_id, is_auto
  ) values (
    v_bank, p_tanggal, p_tipe, p_amount, p_keterangan, p_ref_table, p_ref_id, true
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 4. TRIGGER PENCATATAN OTOMATIS
-- ---------------------------------------------------------------------

-- 4a. Setoran & penarikan investor (mutasi klaim lain diabaikan)
create or replace function trg_cash_investor_ledger()
returns trigger
language plpgsql
as $$
declare
  v_nama text;
begin
  if TG_OP = 'DELETE' then
    delete from cash_ledger where is_auto and ref_table = 'investor_ledger' and ref_id = OLD.id;
    return OLD;
  end if;

  select nama into v_nama from investors where id = NEW.investor_id;

  if NEW.tipe = 'SETORAN' then
    perform fn_sync_cash('investor_ledger', NEW.id, 'SETORAN_INVESTOR',
      NEW.tanggal, NEW.amount, 'Setoran dana ' || coalesce(v_nama, 'investor'));
    delete from cash_ledger
    where is_auto and ref_table = 'investor_ledger' and ref_id = NEW.id
      and tipe = 'PENARIKAN_INVESTOR';

  elsif NEW.tipe = 'PENARIKAN' then
    -- amount sudah negatif di investor_ledger, dipakai apa adanya
    perform fn_sync_cash('investor_ledger', NEW.id, 'PENARIKAN_INVESTOR',
      NEW.tanggal, NEW.amount, coalesce(v_nama, 'Investor') || ' — ' || NEW.keterangan);
    delete from cash_ledger
    where is_auto and ref_table = 'investor_ledger' and ref_id = NEW.id
      and tipe = 'SETORAN_INVESTOR';

  else
    -- ALOKASI_MODAL / PENGEMBALIAN_MODAL / BAGI_HASIL / PENYESUAIAN:
    -- murni perpindahan klaim, tidak ada uang keluar-masuk rekening.
    delete from cash_ledger where is_auto and ref_table = 'investor_ledger' and ref_id = NEW.id;
  end if;

  return NEW;
end;
$$;

drop trigger if exists tr_cash_investor_ledger on investor_ledger;
create trigger tr_cash_investor_ledger
after insert or update or delete on investor_ledger
for each row execute function trg_cash_investor_ledger();

-- 4b. Pembelian unit
create or replace function trg_cash_purchases()
returns trigger
language plpgsql
as $$
declare
  v_car text;
begin
  if TG_OP = 'DELETE' then
    delete from cash_ledger where is_auto and ref_table = 'purchases' and ref_id = OLD.id;
    return OLD;
  end if;

  select merek || ' ' || tipe || ' ' || tahun into v_car from cars where id = NEW.car_id;

  perform fn_sync_cash('purchases', NEW.id, 'PEMBELIAN_UNIT',
    NEW.tanggal_beli, -NEW.total_modal,
    'Pembelian ' || coalesce(v_car, 'unit') || ' (' || NEW.no_transaksi || ')');

  return NEW;
end;
$$;

drop trigger if exists tr_cash_purchases on purchases;
create trigger tr_cash_purchases
after insert or update or delete on purchases
for each row execute function trg_cash_purchases();

-- 4c. Perbaikan
create or replace function trg_cash_repairs()
returns trigger
language plpgsql
as $$
declare
  v_car text;
begin
  if TG_OP = 'DELETE' then
    delete from cash_ledger where is_auto and ref_table = 'repairs' and ref_id = OLD.id;
    return OLD;
  end if;

  select merek || ' ' || tipe || ' ' || tahun into v_car from cars where id = NEW.car_id;

  perform fn_sync_cash('repairs', NEW.id, 'PERBAIKAN',
    NEW.tanggal_masuk, -NEW.biaya,
    NEW.jenis_perbaikan || ' — ' || coalesce(v_car, 'unit'));

  return NEW;
end;
$$;

drop trigger if exists tr_cash_repairs on repairs;
create trigger tr_cash_repairs
after insert or update or delete on repairs
for each row execute function trg_cash_repairs();

-- 4d. Penjualan unit — uang masuk & biaya penjualan dicatat terpisah
create or replace function trg_cash_car_sales()
returns trigger
language plpgsql
as $$
declare
  v_car text;
begin
  if TG_OP = 'DELETE' then
    delete from cash_ledger where is_auto and ref_table = 'car_sales' and ref_id = OLD.id;
    return OLD;
  end if;

  select merek || ' ' || tipe || ' ' || tahun into v_car from cars where id = NEW.car_id;

  perform fn_sync_cash('car_sales', NEW.id, 'PENJUALAN_UNIT',
    NEW.tanggal_jual, NEW.harga_jual,
    'Penjualan ' || coalesce(v_car, 'unit') || ' (' || NEW.no_transaksi || ')');

  perform fn_sync_cash('car_sales', NEW.id, 'BIAYA_PENJUALAN',
    NEW.tanggal_jual, -(NEW.komisi_sales + NEW.biaya_lain),
    'Komisi sales & biaya penjualan ' || coalesce(v_car, 'unit'));

  return NEW;
end;
$$;

drop trigger if exists tr_cash_car_sales on car_sales;
create trigger tr_cash_car_sales
after insert or update or delete on car_sales
for each row execute function trg_cash_car_sales();

-- 4e. Biaya operasional
create or replace function trg_cash_opex()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'DELETE' then
    delete from cash_ledger where is_auto and ref_table = 'operational_expenses' and ref_id = OLD.id;
    return OLD;
  end if;

  perform fn_sync_cash('operational_expenses', NEW.id, 'BIAYA_OPERASIONAL',
    NEW.tanggal, -NEW.nominal,
    NEW.kategori || coalesce(' — ' || NEW.keterangan, ''));

  return NEW;
end;
$$;

drop trigger if exists tr_cash_opex on operational_expenses;
create trigger tr_cash_opex
after insert or update or delete on operational_expenses
for each row execute function trg_cash_opex();

-- 4f. Pembelian aset perusahaan
create or replace function trg_cash_assets()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'DELETE' then
    delete from cash_ledger where is_auto and ref_table = 'company_assets' and ref_id = OLD.id;
    return OLD;
  end if;

  perform fn_sync_cash('company_assets', NEW.id, 'PEMBELIAN_ASET',
    NEW.tanggal_beli, -NEW.harga_beli,
    'Pembelian aset ' || NEW.nama);

  return NEW;
end;
$$;

drop trigger if exists tr_cash_assets on company_assets;
create trigger tr_cash_assets
after insert or update or delete on company_assets
for each row execute function trg_cash_assets();

-- ---------------------------------------------------------------------
-- 5. MUTASI KAS MANUAL
-- ---------------------------------------------------------------------

/*
 * Input manual untuk hal yang tidak punya transaksi operasionalnya sendiri:
 * setor modal pengelola, prive, transfer antar rekening, koreksi.
 * Tipe yang sudah dicatat otomatis sengaja ditolak supaya tidak dobel.
 */
create or replace function catat_mutasi_kas(
  p_bank_account_id uuid,
  p_tanggal date,
  p_tipe cash_type,
  p_amount numeric,
  p_keterangan text
)
returns uuid
language plpgsql
as $$
declare
  v_saldo numeric;
  v_id uuid;
begin
  if p_amount = 0 then
    raise exception 'Nominal tidak boleh nol';
  end if;

  if p_tipe in (
    'SETORAN_INVESTOR','PENARIKAN_INVESTOR','PEMBELIAN_UNIT','PERBAIKAN',
    'PENJUALAN_UNIT','BIAYA_PENJUALAN','BIAYA_OPERASIONAL','PEMBELIAN_ASET'
  ) then
    raise exception 'Mutasi jenis ini dicatat otomatis dari transaksinya, tidak bisa diinput manual';
  end if;

  if p_amount < 0 then
    select saldo into v_saldo from v_bank_balance where bank_account_id = p_bank_account_id;
    if coalesce(v_saldo, 0) + p_amount < 0 then
      raise exception 'Saldo rekening tidak cukup (saldo %, dibutuhkan %)',
        coalesce(v_saldo, 0), -p_amount;
    end if;
  end if;

  insert into cash_ledger (bank_account_id, tanggal, tipe, amount, keterangan, is_auto)
  values (p_bank_account_id, p_tanggal, p_tipe, p_amount, p_keterangan, false)
  returning id into v_id;

  return v_id;
end;
$$;

/*
 * Cairkan hak pengelola ke rekening pribadi.
 * Dibatasi dua hal sekaligus: hak yang belum dicairkan, dan saldo rekening.
 */
create or replace function cairkan_hak_pengelola(
  p_bank_account_id uuid,
  p_amount numeric,
  p_tanggal date default current_date,
  p_keterangan text default null
)
returns uuid
language plpgsql
as $$
declare
  h record;
  v_sisa numeric;
begin
  if p_amount <= 0 then
    raise exception 'Nominal pencairan harus lebih dari nol';
  end if;

  -- Posisi kas pengelola = modal sendiri yang disetor + bagian laba yang
  -- jadi haknya, dikurangi beban yang ditanggungnya (operasional & aset)
  -- dan yang sudah pernah ditarik.
  select * into h from v_hak_pengelola;
  v_sisa := h.modal_disetor + h.porsi_bagi_hasil
            - h.biaya_operasional - h.pembelian_aset - h.sudah_dicairkan;

  if p_amount > v_sisa then
    raise exception 'Pencairan melebihi hak pengelola yang tersedia (tersedia %)', v_sisa;
  end if;

  return catat_mutasi_kas(
    p_bank_account_id, p_tanggal, 'PRIVE_PENGELOLA', -p_amount,
    coalesce(nullif(p_keterangan, ''), 'Pencairan hak pengelola ke rekening pribadi')
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 6. BACKFILL
--    Menyusulkan pencatatan kas untuk data yang sudah terlanjur ada
--    (mis. rekening baru dibuat setelah transaksi berjalan).
--    Aman dijalankan berulang: baris otomatis ditulis ulang, mutasi manual
--    tidak disentuh.
-- ---------------------------------------------------------------------
create or replace function fn_backfill_cash()
returns void
language plpgsql
as $$
declare
  r record;
begin
  delete from cash_ledger where is_auto;

  for r in
    select l.id, l.tanggal, l.amount, l.tipe, l.keterangan, i.nama
    from investor_ledger l join investors i on i.id = l.investor_id
    where l.tipe in ('SETORAN', 'PENARIKAN')
  loop
    if r.tipe = 'SETORAN' then
      perform fn_sync_cash('investor_ledger', r.id, 'SETORAN_INVESTOR',
        r.tanggal, r.amount, 'Setoran dana ' || r.nama);
    else
      perform fn_sync_cash('investor_ledger', r.id, 'PENARIKAN_INVESTOR',
        r.tanggal, r.amount, r.nama || ' — ' || r.keterangan);
    end if;
  end loop;

  for r in
    select p.id, p.tanggal_beli, p.total_modal, p.no_transaksi,
           c.merek || ' ' || c.tipe || ' ' || c.tahun as unit
    from purchases p join cars c on c.id = p.car_id
  loop
    perform fn_sync_cash('purchases', r.id, 'PEMBELIAN_UNIT',
      r.tanggal_beli, -r.total_modal,
      'Pembelian ' || r.unit || ' (' || r.no_transaksi || ')');
  end loop;

  for r in
    select rp.id, rp.tanggal_masuk, rp.biaya, rp.jenis_perbaikan,
           c.merek || ' ' || c.tipe || ' ' || c.tahun as unit
    from repairs rp join cars c on c.id = rp.car_id
  loop
    perform fn_sync_cash('repairs', r.id, 'PERBAIKAN',
      r.tanggal_masuk, -r.biaya, r.jenis_perbaikan || ' — ' || r.unit);
  end loop;

  for r in
    select s.id, s.tanggal_jual, s.harga_jual, s.komisi_sales, s.biaya_lain, s.no_transaksi,
           c.merek || ' ' || c.tipe || ' ' || c.tahun as unit
    from car_sales s join cars c on c.id = s.car_id
  loop
    perform fn_sync_cash('car_sales', r.id, 'PENJUALAN_UNIT',
      r.tanggal_jual, r.harga_jual,
      'Penjualan ' || r.unit || ' (' || r.no_transaksi || ')');
    perform fn_sync_cash('car_sales', r.id, 'BIAYA_PENJUALAN',
      r.tanggal_jual, -(r.komisi_sales + r.biaya_lain),
      'Komisi sales & biaya penjualan ' || r.unit);
  end loop;

  for r in select id, tanggal, nominal, kategori, keterangan from operational_expenses loop
    perform fn_sync_cash('operational_expenses', r.id, 'BIAYA_OPERASIONAL',
      r.tanggal, -r.nominal, r.kategori || coalesce(' — ' || r.keterangan, ''));
  end loop;

  for r in select id, tanggal_beli, harga_beli, nama from company_assets loop
    perform fn_sync_cash('company_assets', r.id, 'PEMBELIAN_ASET',
      r.tanggal_beli, -r.harga_beli, 'Pembelian aset ' || r.nama);
  end loop;
end;
$$;
