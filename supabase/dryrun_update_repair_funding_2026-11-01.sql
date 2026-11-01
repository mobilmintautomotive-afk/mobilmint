-- =====================================================================
-- DRY RUN update_repair_funding (2026-11-01)
--
-- Berisi salinan migrasi 20261101000200_update_repair_funding.sql + tes,
-- jalankan SEKALIGUS (Ctrl+A lalu Run, satu transaksi implisit). Blok tes
-- selalu diakhiri `raise exception 'DRYRUN OK ...'`, jadi SEMUA perubahan
-- -- termasuk create function -- otomatis di-rollback. Hasil uji dibaca
-- dari pesan error-nya.
-- =====================================================================

-- =====================================================================
-- MobilMint — Migration: edit perbaikan ikut menyesuaikan modal investor
--
-- Bug: edit perbaikan cuma menjalankan `update repairs`. Kalau perbaikan
-- itu ambil_dari_modal = true, saldo investor sudah dipotong lewat
-- allocate_repair_funding (investor_ledger ALOKASI_MODAL, ref_table =
-- 'repairs'). Saat biaya / centang ambil_dari_modal diubah, entri ledger
-- itu tidak ikut disesuaikan, jadi HPP (v_car_hpp, dari repairs.biaya)
-- dan potongan modal investor tidak lagi sama -- dan modal yang
-- dikembalikan process_profit_sharing (funding + ALOKASI_MODAL perbaikan)
-- ikut beda dengan HPP unit.
--
-- Prinsip anti dobel hitung (sama dengan update_purchase_funding):
-- entri ALOKASI_MODAL LAMA milik perbaikan ini dihapus DULU, baru
-- repairs di-update dan allocate_repair_funding dipanggil ulang kalau
-- centang masih aktif. Hasil akhirnya selalu:
--   -sum(ALOKASI_MODAL ref repair ini) = biaya baru  (centang aktif)
--                                      = 0           (centang dilepas)
-- Semua dalam SATU fungsi plpgsql = satu transaksi; exception di tengah
-- jalan membatalkan seluruh perubahan, termasuk penghapusan entri lama.
--
-- Unit yang sudah TERJUAL/SELESAI atau sudah diproses bagi hasilnya
-- tidak boleh diedit lagi: HPP-nya sudah terkunci di
-- car_sales.hpp_snapshot dan modal kembali sudah dibukukan.
-- =====================================================================

create or replace function update_repair_funding(
  p_repair_id uuid,
  p_car_id uuid,
  p_vendor_id uuid,
  p_jenis_perbaikan text,
  p_deskripsi text,
  p_biaya numeric,
  p_tanggal_masuk date,
  p_tanggal_selesai date,
  p_status text,
  p_ambil_dari_modal boolean
)
returns void
language plpgsql
as $$
declare
  v_repair repairs%rowtype;
  v_status car_status;
  v_total_alokasi numeric;
  v_harus numeric;
begin
  select * into v_repair from repairs where id = p_repair_id for update;
  if not found then
    raise exception 'Data perbaikan tidak ditemukan';
  end if;

  -- cek unit lama & unit baru (kalau perbaikan dipindah ke unit lain)
  select status into v_status from cars where id = v_repair.car_id;
  if v_status in ('TERJUAL', 'SELESAI')
     or exists (select 1 from car_sales where car_id = v_repair.car_id and is_profit_shared) then
    raise exception 'Unit ini sudah terjual / bagi hasilnya sudah diproses, perbaikannya tidak bisa diedit lagi.';
  end if;

  if p_car_id <> v_repair.car_id then
    select status into v_status from cars where id = p_car_id;
    if not found then
      raise exception 'Unit tujuan tidak ditemukan';
    end if;
    if v_status in ('TERJUAL', 'SELESAI')
       or exists (select 1 from car_sales where car_id = p_car_id and is_profit_shared) then
      raise exception 'Unit tujuan sudah terjual, tidak bisa ditambahkan perbaikan.';
    end if;
  end if;

  -- Balikin dulu potongan saldo yang lama sebelum realokasi.
  delete from investor_ledger
  where tipe = 'ALOKASI_MODAL' and ref_table = 'repairs' and ref_id = p_repair_id;

  update repairs set
    car_id = p_car_id,
    vendor_id = p_vendor_id,
    jenis_perbaikan = p_jenis_perbaikan,
    deskripsi = p_deskripsi,
    biaya = p_biaya,
    tanggal_masuk = p_tanggal_masuk,
    tanggal_selesai = p_tanggal_selesai,
    status = p_status::repair_status,
    ambil_dari_modal = p_ambil_dari_modal
  where id = p_repair_id;

  if p_ambil_dari_modal and p_biaya > 0 then
    perform allocate_repair_funding(p_repair_id);
  end if;

  -- pengaman terakhir: potongan modal harus persis sama dengan biaya
  select coalesce(-sum(amount), 0) into v_total_alokasi
  from investor_ledger
  where tipe = 'ALOKASI_MODAL' and ref_table = 'repairs' and ref_id = p_repair_id;

  -- (dihitung ke variabel dulu: plpgsql membaca kondisi IF sampai THEN
  --  pertama, jadi CASE ... THEN di dalam kondisi IF bikin syntax error)
  v_harus := case when p_ambil_dari_modal then p_biaya else 0 end;
  if v_total_alokasi <> v_harus then
    raise exception 'Alokasi modal perbaikan (%) tidak sama dengan biaya (%)',
      v_total_alokasi, v_harus;
  end if;
end;
$$;


do $$
declare
  v_rep repairs%rowtype;
  v_orig_alloc numeric;
  v_saldo_awal numeric;
  v_cash_awal numeric;
  v_alloc numeric;
  v_n_ledger int;
  v_n_fund int;
  v_log text := '';
  v_sold uuid;
  v_ok boolean;
begin
  select coalesce(sum(amount), 0) into v_saldo_awal from investor_ledger;
  select coalesce(sum(amount), 0) into v_cash_awal from cash_ledger;

  select r.* into v_rep
  from repairs r join cars c on c.id = r.car_id
  where r.ambil_dari_modal and r.biaya > 0
    and c.status not in ('TERJUAL', 'SELESAI')
    and not exists (select 1 from car_sales s where s.car_id = r.car_id and s.is_profit_shared)
    and exists (select 1 from investor_ledger l
                where l.tipe = 'ALOKASI_MODAL' and l.ref_table = 'repairs' and l.ref_id = r.id)
  order by r.created_at desc
  limit 1;
  if not found then
    raise exception 'DRYRUN: tidak ada perbaikan ambil_dari_modal di unit aktif untuk diuji';
  end if;

  select coalesce(-sum(amount), 0) into v_orig_alloc from investor_ledger
  where tipe = 'ALOKASI_MODAL' and ref_table = 'repairs' and ref_id = v_rep.id;
  select count(*) into v_n_fund from car_fundings where car_id = v_rep.car_id and amount > 0;
  v_log := format('repair=%s biaya=%s alokasi_awal=%s fundings=%s | ',
    v_rep.id, v_rep.biaya, v_orig_alloc, v_n_fund);

  -- 1. naikkan biaya
  perform update_repair_funding(v_rep.id, v_rep.car_id, v_rep.vendor_id, v_rep.jenis_perbaikan,
    v_rep.deskripsi, v_rep.biaya + 150000, v_rep.tanggal_masuk, v_rep.tanggal_selesai,
    v_rep.status::text, true);
  select coalesce(-sum(amount), 0), count(*) into v_alloc, v_n_ledger from investor_ledger
  where tipe = 'ALOKASI_MODAL' and ref_table = 'repairs' and ref_id = v_rep.id;
  if v_alloc <> v_rep.biaya + 150000 then raise exception 'GAGAL T1 naik: alokasi % <> %', v_alloc, v_rep.biaya + 150000; end if;
  if v_n_ledger > v_n_fund then raise exception 'GAGAL T1: % entri ledger > % funding (dobel?)', v_n_ledger, v_n_fund; end if;
  if (select coalesce(-sum(amount), 0) from cash_ledger where is_auto and tipe = 'PERBAIKAN' and ref_table = 'repairs' and ref_id = v_rep.id) <> v_rep.biaya + 150000 then
    raise exception 'GAGAL T1: cash_ledger tidak ikut biaya baru';
  end if;
  v_log := v_log || format('T1 naik ok (alokasi=%s, %s entri) | ', v_alloc, v_n_ledger);

  -- 2. turunkan biaya
  perform update_repair_funding(v_rep.id, v_rep.car_id, v_rep.vendor_id, v_rep.jenis_perbaikan,
    v_rep.deskripsi, greatest(v_rep.biaya - 100000, 1000), v_rep.tanggal_masuk, v_rep.tanggal_selesai,
    v_rep.status::text, true);
  select coalesce(-sum(amount), 0) into v_alloc from investor_ledger
  where tipe = 'ALOKASI_MODAL' and ref_table = 'repairs' and ref_id = v_rep.id;
  if v_alloc <> greatest(v_rep.biaya - 100000, 1000) then raise exception 'GAGAL T2 turun: alokasi %', v_alloc; end if;
  v_log := v_log || format('T2 turun ok (alokasi=%s) | ', v_alloc);

  -- 3. lepas centang
  perform update_repair_funding(v_rep.id, v_rep.car_id, v_rep.vendor_id, v_rep.jenis_perbaikan,
    v_rep.deskripsi, v_rep.biaya, v_rep.tanggal_masuk, v_rep.tanggal_selesai,
    v_rep.status::text, false);
  select coalesce(-sum(amount), 0) into v_alloc from investor_ledger
  where tipe = 'ALOKASI_MODAL' and ref_table = 'repairs' and ref_id = v_rep.id;
  if v_alloc <> 0 then raise exception 'GAGAL T3 lepas centang: alokasi %', v_alloc; end if;
  if (select coalesce(sum(amount), 0) from investor_ledger) <> v_saldo_awal + v_orig_alloc then
    raise exception 'GAGAL T3: total saldo investor tidak naik sebesar alokasi lama';
  end if;
  v_log := v_log || 'T3 lepas centang ok (alokasi=0, saldo kembali) | ';

  -- 4. centang lagi, biaya asli -> kondisi semula
  perform update_repair_funding(v_rep.id, v_rep.car_id, v_rep.vendor_id, v_rep.jenis_perbaikan,
    v_rep.deskripsi, v_rep.biaya, v_rep.tanggal_masuk, v_rep.tanggal_selesai,
    v_rep.status::text, true);
  select coalesce(-sum(amount), 0) into v_alloc from investor_ledger
  where tipe = 'ALOKASI_MODAL' and ref_table = 'repairs' and ref_id = v_rep.id;
  if v_alloc <> v_rep.biaya then raise exception 'GAGAL T4 centang lagi: alokasi % <> %', v_alloc, v_rep.biaya; end if;
  v_log := v_log || format('T4 centang lagi ok (alokasi=%s) | ', v_alloc);
  if (select coalesce(sum(amount), 0) from investor_ledger) <> v_saldo_awal + v_orig_alloc - v_rep.biaya then
    raise exception 'GAGAL T4: total saldo investor tidak konsisten';
  end if;
  if (select coalesce(sum(amount), 0) from cash_ledger) <> v_cash_awal then
    raise exception 'GAGAL T4: total cash_ledger berubah';
  end if;
  v_log := v_log || 'kas tidak berubah | ';

  -- 5. unit yang sudah SELESAI / bagi hasil diproses harus ditolak
  select r.id into v_sold
  from repairs r join cars c on c.id = r.car_id
  where c.status in ('TERJUAL', 'SELESAI')
     or exists (select 1 from car_sales s where s.car_id = r.car_id and s.is_profit_shared)
  limit 1;
  if v_sold is not null then
    v_ok := false;
    begin
      perform update_repair_funding(r.id, r.car_id, r.vendor_id, r.jenis_perbaikan, r.deskripsi,
        r.biaya + 1, r.tanggal_masuk, r.tanggal_selesai, r.status::text, r.ambil_dari_modal)
      from repairs r where r.id = v_sold;
    exception when others then
      v_ok := true;
      v_log := v_log || 'T5 unit terjual ditolak ok: ' || sqlerrm || ' | ';
    end;
    if not v_ok then raise exception 'GAGAL T5: edit unit terjual tidak ditolak'; end if;
  else
    v_log := v_log || 'T5 dilewati (tidak ada unit terjual) | ';
  end if;

  raise exception 'DRYRUN OK -> %', v_log;
end $$;
