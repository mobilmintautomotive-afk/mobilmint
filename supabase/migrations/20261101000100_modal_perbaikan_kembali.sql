-- =====================================================================
-- Modal perbaikan ikut kembali saat bagi hasil diproses
--
-- Bug: perbaikan yang dicentang "ambil dari modal investor" memotong
-- saldo investor lewat allocate_repair_funding (ALOKASI_MODAL dengan
-- ref_table='repairs'), tapi process_profit_sharing cuma mengembalikan
-- car_fundings.amount (modal harga beli). Biaya perbaikan sudah masuk
-- HPP -- artinya sudah ketutup dari harga jual -- tapi tidak pernah
-- kembali ke saldo investor, jadi nyangkut sebagai "modal berjalan" di
-- unit yang sudah selesai.
--
-- Perbaikan: modal yang dikembalikan per investor = funding unit +
-- total ALOKASI_MODAL perbaikan unit itu yang benar-benar dipotong dari
-- investor tsb (diambil dari ledger, bukan dari repairs.biaya, supaya
-- persis sama dengan yang dipotong). Pembagian bagi hasil & porsi_pct
-- tetap mengikuti funding seperti sebelumnya -- tidak ada perubahan
-- angka bagi hasil.
--
-- reverse_profit_sharing tidak perlu diubah: ia membalik
-- profit_sharing_details.modal_kembali, yang sekarang sudah termasuk
-- modal perbaikan.
-- =====================================================================

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
  create temp table _bh (
    investor_id uuid, funding numeric, modal numeric, porsi_pct numeric, bagi_hasil numeric
  ) on commit drop;

  insert into _bh
  select
    f.investor_id,
    f.funding,
    f.funding + coalesce((
      select -sum(l.amount)
      from investor_ledger l
      join repairs rp on rp.id = l.ref_id
      where l.tipe = 'ALOKASI_MODAL'
        and l.ref_table = 'repairs'
        and rp.car_id = v_sale.car_id
        and l.investor_id = f.investor_id
    ), 0),
    round(f.funding / v_total_modal * 100, 4),
    round(v_porsi_investor * (f.funding / v_total_modal), 0)
  from (
    select investor_id, sum(amount) as funding
    from car_fundings
    where car_id = v_sale.car_id
    group by investor_id
  ) f;

  -- pastikan tidak ada rupiah yang hilang karena pembulatan
  select coalesce(sum(bagi_hasil), 0) into v_sum from _bh;
  v_diff := v_porsi_investor - v_sum;
  if v_diff <> 0 then
    select investor_id into v_biggest from _bh order by funding desc limit 1;
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
