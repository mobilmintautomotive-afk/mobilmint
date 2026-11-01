-- =====================================================================
-- Koreksi data: kembalikan modal perbaikan yang nyangkut di unit selesai
-- (dijalankan sekali, 2026-11-01, bersama migrasi
--  20261101000100_modal_perbaikan_kembali.sql)
--
-- Untuk tiap bagi hasil yang belum dibatalkan, modal perbaikan yang
-- dipotong dari investor (ALOKASI_MODAL ref_table='repairs' pada unit
-- itu) belum pernah dikembalikan. Skrip ini:
--   1. menambah 1 entri PENGEMBALIAN_MODAL per (bagi hasil, investor)
--      senilai modal perbaikan itu, bertanggal sama dengan tanggal
--      proses bagi hasilnya supaya riwayat saldo ikut benar;
--   2. menaikkan modal_awal / modal_kembali / total_kembali di
--      profit_sharing_details supaya pembatalan bagi hasil nanti
--      membalik angka yang benar.
-- Entri lama tidak diubah/dihapus. Bagi hasil tidak berubah.
--
-- Pengaman: hanya menyentuh baris yang modal_kembali-nya masih sama
-- dengan funding (belum pernah dikoreksi), dan seluruh blok dibatalkan
-- kalau jumlah baris/total/modal berjalan tidak sesuai perkiraan.
-- =====================================================================

do $$
declare
  r record;
  v_rows int := 0;
  v_total numeric := 0;
  v_bad int;
begin
  for r in
    select
      ps.id as ps_id,
      ps.tanggal_proses,
      d.id as detail_id,
      d.investor_id,
      d.modal_kembali,
      c.merek || ' ' || c.tipe || ' ' || c.tahun as unit,
      (select coalesce(sum(f.amount), 0) from car_fundings f
        where f.car_id = ps.car_id and f.investor_id = d.investor_id) as funding,
      (select coalesce(-sum(l.amount), 0)
         from investor_ledger l join repairs rp on rp.id = l.ref_id
        where l.tipe = 'ALOKASI_MODAL' and l.ref_table = 'repairs'
          and rp.car_id = ps.car_id and l.investor_id = d.investor_id) as perbaikan
    from profit_sharings ps
    join profit_sharing_details d on d.profit_sharing_id = ps.id
    join cars c on c.id = ps.car_id
    where not ps.is_reversed
  loop
    continue when r.perbaikan <= 0;

    if r.modal_kembali <> r.funding then
      raise exception 'Detail % (%): modal_kembali % <> funding %, sudah pernah dikoreksi?',
        r.detail_id, r.unit, r.modal_kembali, r.funding;
    end if;

    insert into investor_ledger (investor_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
    values (
      r.investor_id, 'PENGEMBALIAN_MODAL', r.perbaikan,
      'Koreksi: modal perbaikan kembali dari ' || r.unit,
      'profit_sharings', r.ps_id, r.tanggal_proses
    );

    update profit_sharing_details
       set modal_awal    = modal_awal + r.perbaikan,
           modal_kembali = modal_kembali + r.perbaikan,
           total_kembali = total_kembali + r.perbaikan
     where id = r.detail_id;

    v_rows := v_rows + 1;
    v_total := v_total + r.perbaikan;
  end loop;

  if v_rows <> 19 or v_total <> 100135000 then
    raise exception 'Tidak sesuai perkiraan: % baris, total % (harusnya 19 baris, 100135000)', v_rows, v_total;
  end if;

  -- Modal berjalan tiap investor harus = modal di unit yang BELUM selesai
  -- bagi hasil (funding + perbaikan yang dipotong dari investor itu).
  select count(*) into v_bad
  from v_investor_balance b
  where b.modal_berjalan <> (
      coalesce((select sum(f.amount) from car_fundings f
        where f.investor_id = b.investor_id
          and not exists (select 1 from profit_sharings ps
                          where ps.car_id = f.car_id and not ps.is_reversed)), 0)
    + coalesce((select -sum(l.amount)
         from investor_ledger l join repairs rp on rp.id = l.ref_id
        where l.tipe = 'ALOKASI_MODAL' and l.ref_table = 'repairs'
          and l.investor_id = b.investor_id
          and not exists (select 1 from profit_sharings ps
                          where ps.car_id = rp.car_id and not ps.is_reversed)), 0)
  );
  if v_bad > 0 then
    raise exception 'Modal berjalan % investor masih tidak cocok setelah koreksi', v_bad;
  end if;

  raise notice 'OK: % baris dikoreksi, total %', v_rows, v_total;
end $$;
