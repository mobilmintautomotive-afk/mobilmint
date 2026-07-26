-- =====================================================================
-- MobilMint — Migration 002: View & Function
-- Semua rumus keuangan yang bersifat atomik hidup di sini (bukan di JS).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. VIEW
-- ---------------------------------------------------------------------

-- HPP per unit
create or replace view v_car_hpp as
select
  c.id as car_id,
  coalesce(p.total_modal, 0) as modal_pembelian,
  coalesce((select sum(r.biaya) from repairs r where r.car_id = c.id), 0) as total_perbaikan,
  coalesce(p.total_modal, 0)
    + coalesce((select sum(r.biaya) from repairs r where r.car_id = c.id), 0) as hpp
from cars c
left join purchases p on p.car_id = c.id;

-- Saldo investor (SUM ledger — satu-satunya sumber kebenaran saldo)
create or replace view v_investor_balance as
select
  i.id as investor_id,
  i.nama,
  coalesce(sum(l.amount), 0) as saldo,
  coalesce(sum(l.amount) filter (where l.tipe = 'SETORAN'), 0) as total_investasi,
  coalesce(sum(l.amount) filter (where l.tipe = 'BAGI_HASIL'), 0) as total_bagi_hasil,
  coalesce(-sum(l.amount) filter (where l.tipe = 'ALOKASI_MODAL'), 0)
    - coalesce(sum(l.amount) filter (where l.tipe = 'PENGEMBALIAN_MODAL'), 0) as modal_berjalan,
  coalesce(-sum(l.amount) filter (where l.tipe = 'PENARIKAN'), 0) as total_penarikan
from investors i
left join investor_ledger l on l.investor_id = i.id
group by i.id, i.nama;

-- Ringkasan dashboard holding (all-time)
create or replace view v_dashboard_summary as
select
  (select count(*) from investors where is_active) as jumlah_investor,
  (select coalesce(sum(nilai_investasi),0) from investor_contracts where status = 'AKTIF') as total_investasi,
  (select coalesce(sum(saldo),0) from v_investor_balance) as total_saldo,
  (select count(*) from cars where status in ('TERJUAL','SELESAI')) as total_unit_terjual,
  (select count(*) from cars where status = 'READY_STOCK') as total_unit_available,
  (select coalesce(sum(h.hpp),0) from cars c join v_car_hpp h on h.car_id = c.id
     where c.status in ('DIBELI','PERBAIKAN','READY_STOCK')) as total_modal_available,
  (select coalesce(sum(laba_bersih),0) from car_sales) as total_laba_bersih,
  (select coalesce(sum(porsi_investor),0) from profit_sharings where not is_reversed) as total_bagi_hasil;

-- Ringkasan unit + HPP + tanggal siklus (dipakai list mobil, stock, detail)
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
    when c.status in ('DIBELI','PERBAIKAN','READY_STOCK') and p.tanggal_beli is not null
      then (current_date - p.tanggal_beli)
    else null
  end as umur_stok_hari
from cars c
left join v_car_hpp h on h.car_id = c.id
left join purchases p on p.car_id = c.id
left join suppliers s on s.id = p.supplier_id
left join car_sales cs on cs.car_id = c.id;

-- ---------------------------------------------------------------------
-- 2. PENOMORAN DOKUMEN — PREFIX-YYYYMM-NNNN
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
-- 3. PREVIEW ALOKASI MODAL (proporsional terhadap saldo tersedia)
--    Selisih pembulatan dibebankan ke baris dengan amount terbesar.
-- ---------------------------------------------------------------------
create or replace function fn_preview_allocation(p_total numeric)
returns table (
  investor_id uuid,
  nama text,
  saldo numeric,
  porsi_pct numeric,
  amount numeric
)
language plpgsql
as $$
declare
  v_total_saldo numeric;
  v_sum numeric := 0;
  v_diff numeric;
begin
  drop table if exists _alloc;
  create temp table _alloc (
    investor_id uuid,
    nama text,
    saldo numeric,
    porsi_pct numeric,
    amount numeric
  ) on commit drop;

  select coalesce(sum(b.saldo), 0) into v_total_saldo
  from v_investor_balance b
  join investors i on i.id = b.investor_id
  where b.saldo > 0 and i.is_active;

  if v_total_saldo <= 0 then
    return;
  end if;

  insert into _alloc
  select
    b.investor_id,
    b.nama,
    b.saldo,
    round(b.saldo / v_total_saldo * 100, 4),
    round(p_total * (b.saldo / v_total_saldo), 0)
  from v_investor_balance b
  join investors i on i.id = b.investor_id
  where b.saldo > 0 and i.is_active;

  -- Jangan pernah mengalokasikan melebihi saldo investor.
  -- Semua referensi kolom WAJIB dikualifikasi dengan alias `a`, karena nama
  -- kolom di sini sama persis dengan nama OUT parameter function ini.
  update _alloc a set amount = a.saldo where a.amount > a.saldo;

  select coalesce(sum(a.amount), 0) into v_sum from _alloc a;
  v_diff := p_total - v_sum;

  if v_diff <> 0 then
    -- bebankan selisih ke investor dengan alokasi terbesar yang masih muat
    update _alloc a
    set amount = a.amount + v_diff
    where a.investor_id = (
      select x.investor_id from _alloc x
      where x.saldo >= x.amount + v_diff
      order by x.amount desc
      limit 1
    );
  end if;

  return query select a.investor_id, a.nama, a.saldo, a.porsi_pct, a.amount
               from _alloc a order by a.amount desc;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. ALOKASI MODAL PEMBELIAN (atomik)
--    p_allocations: [{"investor_id":"uuid","amount":60000000}, ...]
-- ---------------------------------------------------------------------
create or replace function allocate_purchase_funding(p_purchase_id uuid, p_allocations jsonb)
returns void
language plpgsql
as $$
declare
  v_purchase purchases%rowtype;
  v_total_alokasi numeric := 0;
  v_car_label text;
  r record;
  v_saldo numeric;
  v_contract investor_contracts%rowtype;
begin
  select * into v_purchase from purchases where id = p_purchase_id;
  if not found then
    raise exception 'Pembelian tidak ditemukan';
  end if;

  select merek || ' ' || tipe || ' ' || tahun into v_car_label from cars where id = v_purchase.car_id;

  select coalesce(sum((e->>'amount')::numeric), 0) into v_total_alokasi
  from jsonb_array_elements(p_allocations) e;

  if round(v_total_alokasi, 2) <> round(v_purchase.total_modal, 2) then
    raise exception 'Total alokasi (%) tidak sama dengan total modal (%)',
      v_total_alokasi, v_purchase.total_modal;
  end if;

  for r in
    select (e->>'investor_id')::uuid as investor_id, (e->>'amount')::numeric as amount
    from jsonb_array_elements(p_allocations) e
  loop
    if r.amount <= 0 then
      continue;
    end if;

    select coalesce(saldo, 0) into v_saldo from v_investor_balance where investor_id = r.investor_id;
    if v_saldo < r.amount then
      raise exception 'Saldo investor % tidak mencukupi (saldo %, dibutuhkan %)',
        r.investor_id, v_saldo, r.amount;
    end if;

    -- akad aktif terakhir dipakai sebagai sumber snapshot nisbah
    select * into v_contract
    from investor_contracts
    where investor_id = r.investor_id and status = 'AKTIF'
    order by tanggal_akad desc, created_at desc
    limit 1;

    insert into car_fundings (
      car_id, purchase_id, investor_id, contract_id, amount, porsi_pct, nisbah_investor_pct
    ) values (
      v_purchase.car_id,
      p_purchase_id,
      r.investor_id,
      v_contract.id,
      r.amount,
      round(r.amount / nullif(v_purchase.total_modal, 0) * 100, 4),
      coalesce(v_contract.nisbah_investor_pct, 0)
    );

    insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
    values (
      r.investor_id,
      v_contract.id,
      'ALOKASI_MODAL',
      -r.amount,
      'Modal dipakai beli ' || coalesce(v_car_label, 'unit'),
      'purchases',
      p_purchase_id,
      v_purchase.tanggal_beli
    );
  end loop;

  update cars set status = 'DIBELI' where id = v_purchase.car_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. TAMBAHAN ALOKASI MODAL UNTUK BIAYA PERBAIKAN
--    Dipakai kalau admin mencentang "Ambil dari modal investor".
--    Proporsinya mengikuti porsi funding unit tersebut.
-- ---------------------------------------------------------------------
create or replace function allocate_repair_funding(p_repair_id uuid)
returns void
language plpgsql
as $$
declare
  v_repair repairs%rowtype;
  v_car_label text;
  v_total numeric := 0;
  v_sum numeric := 0;
  v_diff numeric;
  r record;
  v_biggest uuid;
begin
  select * into v_repair from repairs where id = p_repair_id;
  if not found then raise exception 'Data perbaikan tidak ditemukan'; end if;
  if v_repair.biaya <= 0 then return; end if;

  select merek || ' ' || tipe || ' ' || tahun into v_car_label from cars where id = v_repair.car_id;
  select coalesce(sum(amount), 0) into v_total from car_fundings where car_id = v_repair.car_id;
  if v_total <= 0 then
    raise exception 'Unit ini belum punya alokasi modal investor';
  end if;

  drop table if exists _rep;
  create temp table _rep (investor_id uuid, amount numeric) on commit drop;

  insert into _rep
  select f.investor_id, round(v_repair.biaya * (f.amount / v_total), 0)
  from car_fundings f where f.car_id = v_repair.car_id;

  select coalesce(sum(amount), 0) into v_sum from _rep;
  v_diff := v_repair.biaya - v_sum;
  if v_diff <> 0 then
    select investor_id into v_biggest from _rep order by amount desc limit 1;
    update _rep set amount = amount + v_diff where investor_id = v_biggest;
  end if;

  for r in select * from _rep where amount > 0 loop
    insert into investor_ledger (investor_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
    values (
      r.investor_id,
      'ALOKASI_MODAL',
      -r.amount,
      'Modal dipakai untuk perbaikan ' || coalesce(v_car_label, 'unit'),
      'repairs',
      p_repair_id,
      v_repair.tanggal_masuk
    );
  end loop;

  drop table _rep;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. PROSES BAGI HASIL (atomik, all-or-nothing)
-- ---------------------------------------------------------------------
create or replace function process_profit_sharing(p_car_sale_id uuid, p_tanggal date default current_date)
returns uuid
language plpgsql
as $$
declare
  v_sale car_sales%rowtype;
  v_car_label text;
  v_total_modal numeric := 0;
  v_nisbah numeric := 0;
  v_porsi_investor numeric := 0;
  v_porsi_pengelola numeric := 0;
  v_sum numeric := 0;
  v_diff numeric;
  v_biggest uuid;
  v_ps_id uuid;
  v_no text;
  r record;
begin
  select * into v_sale from car_sales where id = p_car_sale_id;
  if not found then raise exception 'Transaksi penjualan tidak ditemukan'; end if;
  if v_sale.is_profit_shared then raise exception 'Bagi hasil untuk unit ini sudah diproses'; end if;

  select merek || ' ' || tipe || ' ' || tahun into v_car_label from cars where id = v_sale.car_id;

  select coalesce(sum(amount), 0) into v_total_modal from car_fundings where car_id = v_sale.car_id;
  if v_total_modal <= 0 then
    raise exception 'Unit ini tidak punya alokasi modal investor, bagi hasil tidak bisa diproses';
  end if;

  -- Nisbah unit ini, ditimbang terhadap besar modal tiap pendana.
  -- Urun dana dibatasi hanya untuk investor bernisbah sama, jadi hasilnya
  -- selalu sama dengan nisbah itu sendiri; rumus tertimbang dipertahankan
  -- sebagai pengaman untuk baris lama sebelum aturan tersebut berlaku.
  select coalesce(sum(amount * nisbah_investor_pct) / nullif(sum(amount), 0), 0)
    into v_nisbah
  from car_fundings where car_id = v_sale.car_id;

  v_porsi_investor  := round(v_sale.laba_bersih * v_nisbah / 100, 0);
  v_porsi_pengelola := v_sale.laba_bersih - v_porsi_investor;

  v_no := fn_next_doc_number('BGH', p_tanggal);

  insert into profit_sharings (
    no_transaksi, car_sale_id, car_id, laba_bersih, porsi_investor, porsi_pengelola, tanggal_proses
  ) values (
    v_no, p_car_sale_id, v_sale.car_id, v_sale.laba_bersih, v_porsi_investor, v_porsi_pengelola, p_tanggal
  ) returning id into v_ps_id;

  drop table if exists _bh;
  create temp table _bh (investor_id uuid, modal numeric, porsi_pct numeric, bagi_hasil numeric) on commit drop;

  insert into _bh
  select
    f.investor_id,
    f.amount,
    round(f.amount / v_total_modal * 100, 4),
    round(v_porsi_investor * (f.amount / v_total_modal), 0)
  from car_fundings f
  where f.car_id = v_sale.car_id;

  -- pastikan tidak ada rupiah yang hilang karena pembulatan
  select coalesce(sum(bagi_hasil), 0) into v_sum from _bh;
  v_diff := v_porsi_investor - v_sum;
  if v_diff <> 0 then
    select investor_id into v_biggest from _bh order by modal desc limit 1;
    update _bh set bagi_hasil = bagi_hasil + v_diff where investor_id = v_biggest;
  end if;

  for r in select * from _bh loop
    insert into profit_sharing_details (
      profit_sharing_id, investor_id, modal_awal, porsi_pct, bagi_hasil, modal_kembali, total_kembali
    ) values (
      v_ps_id, r.investor_id, r.modal, r.porsi_pct, r.bagi_hasil, r.modal, r.modal + r.bagi_hasil
    );

    insert into investor_ledger (investor_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
    values (
      r.investor_id, 'PENGEMBALIAN_MODAL', r.modal,
      'Modal kembali dari ' || coalesce(v_car_label, 'unit'),
      'profit_sharings', v_ps_id, p_tanggal
    );

    insert into investor_ledger (investor_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
    values (
      r.investor_id, 'BAGI_HASIL', r.bagi_hasil,
      case when r.bagi_hasil < 0
        then 'Bagian kerugian penjualan ' || coalesce(v_car_label, 'unit')
        else 'Bagi hasil penjualan ' || coalesce(v_car_label, 'unit')
      end,
      'profit_sharings', v_ps_id, p_tanggal
    );
  end loop;

  update car_sales set is_profit_shared = true where id = p_car_sale_id;
  update cars set status = 'SELESAI' where id = v_sale.car_id;

  drop table _bh;
  return v_ps_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. BATALKAN BAGI HASIL (reversal, bukan delete — audit trail tetap utuh)
-- ---------------------------------------------------------------------
create or replace function reverse_profit_sharing(p_profit_sharing_id uuid, p_tanggal date default current_date)
returns void
language plpgsql
as $$
declare
  v_ps profit_sharings%rowtype;
  v_car_label text;
  r record;
begin
  select * into v_ps from profit_sharings where id = p_profit_sharing_id;
  if not found then raise exception 'Data bagi hasil tidak ditemukan'; end if;
  if v_ps.is_reversed then raise exception 'Bagi hasil ini sudah dibatalkan'; end if;

  select merek || ' ' || tipe || ' ' || tahun into v_car_label from cars where id = v_ps.car_id;

  for r in select * from profit_sharing_details where profit_sharing_id = p_profit_sharing_id loop
    insert into investor_ledger (investor_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
    values (
      r.investor_id, 'PENYESUAIAN', -r.modal_kembali,
      'Pembatalan modal kembali ' || coalesce(v_car_label, 'unit'),
      'profit_sharings', p_profit_sharing_id, p_tanggal
    );
    insert into investor_ledger (investor_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
    values (
      r.investor_id, 'PENYESUAIAN', -r.bagi_hasil,
      'Pembatalan bagi hasil ' || coalesce(v_car_label, 'unit'),
      'profit_sharings', p_profit_sharing_id, p_tanggal
    );
  end loop;

  update profit_sharings set is_reversed = true where id = p_profit_sharing_id;
  update car_sales set is_profit_shared = false where id = v_ps.car_sale_id;
  update cars set status = 'TERJUAL' where id = v_ps.car_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 8. CATAT PENARIKAN DANA INVESTOR
-- ---------------------------------------------------------------------
create or replace function record_withdrawal(
  p_investor_id uuid,
  p_amount numeric,
  p_tanggal date default current_date,
  p_catatan text default null
)
returns void
language plpgsql
as $$
declare
  v_saldo numeric;
begin
  if p_amount <= 0 then raise exception 'Jumlah penarikan harus lebih dari nol'; end if;

  select coalesce(saldo, 0) into v_saldo from v_investor_balance where investor_id = p_investor_id;
  if v_saldo < p_amount then
    raise exception 'Penarikan melebihi saldo tersedia (saldo %)', v_saldo;
  end if;

  insert into investor_ledger (investor_id, tipe, amount, keterangan, tanggal)
  values (p_investor_id, 'PENARIKAN', -p_amount, coalesce(p_catatan, 'Penarikan dana'), p_tanggal);
end;
$$;
