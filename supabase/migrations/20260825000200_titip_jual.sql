-- =====================================================================
-- MobilMint — Migration: Titip Jual (konsinyasi & jasa konten)
--
-- Dua skema (dari kesepakatan bisnis dengan mitra konten):
--   JASA_KONTEN — unit TIDAK ditahan, cuma numpang di garasi 1 hari buat
--     difoto/direkam (2-3 konten), lalu dibawa pulang lagi. Sekali fee
--     (default Rp 2.500.000). Konten yang jualkan tetap dari MobilMint.
--   KONSINYASI — unit ditahan di garasi sampai laku, tidak ada fee di
--     depan. Untung MobilMint = harga jual dikurangi harga setor yang
--     disepakati dengan pemilik. Kalau unit ditarik sebelum laku, kena
--     biaya penarikan (besarannya sama seperti fee JASA_KONTEN).
--
-- SENGAJA dipisah total dari cars/purchases/car_fundings: unit titip jual
-- BUKAN milik MobilMint dan TIDAK dibiayai modal investor sama sekali,
-- jadi tidak boleh lewat process_profit_sharing (itu mewajibkan
-- car_fundings terisi). Pendapatannya 100% hak pengelola, bukan dibagi
-- ke investor — makanya masuk ke v_hak_pengelola, bukan profit_sharings.
-- =====================================================================

create table if not exists consignments (
  id uuid primary key default gen_random_uuid(),
  no_titip text not null unique,             -- TTP-YYYYMM-0001
  skema text not null check (skema in ('JASA_KONTEN', 'KONSINYASI')),

  -- Data unit dicatat langsung di sini (bukan FK ke cars) karena unitnya
  -- bukan milik MobilMint dan sifatnya sementara.
  merek text not null,
  tipe text not null,
  tahun int not null,
  no_polisi text,
  foto_urls text[] default '{}',

  nama_pemilik text not null,
  no_tlp_pemilik text,

  tanggal_masuk date not null,

  fee_jasa numeric(18,2) not null default 2500000 check (fee_jasa >= 0),
  harga_setor numeric(18,2) check (harga_setor is null or harga_setor >= 0),

  status text not null default 'PROSES'
    check (status in ('PROSES', 'SELESAI', 'TERJUAL', 'DITARIK')),

  tanggal_selesai date,
  harga_jual numeric(18,2) check (harga_jual is null or harga_jual >= 0),
  pendapatan numeric(18,2) check (pendapatan is null or pendapatan >= 0),

  catatan text,
  created_at timestamptz not null default now()
);
create index if not exists idx_consignments_status on consignments(status);

-- ---------------------------------------------------------------------
-- Daftarkan prefix 'TTP' di fungsi penomoran dokumen yang sudah ada.
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
    when 'TTP' then v_tbl := 'consignments';       v_col := 'no_titip';
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
-- Pencatatan kas otomatis — hanya saat transaksi ditutup (SELESAI /
-- TERJUAL / DITARIK) dan pendapatan-nya terisi. Selagi masih PROSES
-- belum ada uang yang benar-benar pindah, jadi tidak dicatat.
-- ---------------------------------------------------------------------
create or replace function trg_cash_consignments()
returns trigger
language plpgsql
as $$
declare
  v_unit text;
  v_ket text;
begin
  if TG_OP = 'DELETE' then
    delete from cash_ledger where is_auto and ref_table = 'consignments' and ref_id = OLD.id;
    return OLD;
  end if;

  v_unit := NEW.merek || ' ' || NEW.tipe || ' ' || NEW.tahun || ' (' || NEW.no_titip || ')';

  if NEW.status = 'PROSES' or NEW.pendapatan is null then
    delete from cash_ledger where is_auto and ref_table = 'consignments' and ref_id = NEW.id;
    return NEW;
  end if;

  v_ket := case NEW.status
    when 'SELESAI' then 'Fee jasa konten titip jual '
    when 'TERJUAL' then 'Untung konsinyasi titip jual '
    when 'DITARIK' then 'Biaya penarikan titip jual '
  end || v_unit;

  perform fn_sync_cash('consignments', NEW.id, 'PENDAPATAN_TITIP_JUAL',
    coalesce(NEW.tanggal_selesai, NEW.tanggal_masuk), NEW.pendapatan, v_ket);

  return NEW;
end;
$$;

drop trigger if exists tr_cash_consignments on consignments;
create trigger tr_cash_consignments
after insert or update or delete on consignments
for each row execute function trg_cash_consignments();

-- ---------------------------------------------------------------------
-- Pendapatan Titip Jual 100% hak pengelola (bukan dibagi investor, karena
-- tidak ada modal investor di unit ini sama sekali) — tambahkan ke
-- v_hak_pengelola supaya ikut kehitung di saldo yang boleh dicairkan.
-- Nama kolom tetap `porsi_bagi_hasil` biar semua consumer (bank.ts,
-- neraca.ts, cairkan_hak_pengelola) tidak perlu ikut berubah.
-- ---------------------------------------------------------------------
create or replace view v_hak_pengelola as
select
  (select coalesce(sum(porsi_pengelola), 0) from profit_sharings where not is_reversed)
    + (select coalesce(sum(pendapatan), 0) from consignments where status in ('SELESAI', 'TERJUAL', 'DITARIK'))
    as porsi_bagi_hasil,
  (select coalesce(sum(nominal), 0) from operational_expenses)
    as biaya_operasional,
  (select coalesce(sum(harga_beli), 0) from company_assets where status <> 'DIHAPUS')
    as pembelian_aset,
  (select coalesce(-sum(amount), 0) from cash_ledger where tipe = 'PRIVE_PENGELOLA')
    as sudah_dicairkan,
  (select coalesce(sum(amount), 0) from cash_ledger where tipe = 'SETOR_MODAL_PENGELOLA')
    as modal_disetor;
