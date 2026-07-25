-- =====================================================================
-- MobilMint — Migration 004: Pencairan Dana
--
-- Perubahan alur bisnis (keputusan 2026-07-25):
-- 1. Bagi hasil diproses OTOMATIS saat penjualan disimpan — tidak lagi
--    ada tombol "Proses Bagi Hasil" manual terpisah.
-- 2. Pembatalan penjualan (kalau ternyata batal) dilakukan lewat menu
--    Penjualan, yang sekarang juga membalikkan bagi hasil sekaligus
--    (kalau belum ada dana yang dicairkan).
-- 3. Menu "Bagi Hasil" berubah jadi "Pencairan Dana" — melacak apakah
--    porsi bagi hasil investor SUDAH ditransfer ke rekening pribadinya
--    atau belum, lengkap dengan bukti transfer. Begitu dicairkan, saldo
--    investor turun sejumlah bagi hasil itu (balik ke modal pokok).
-- =====================================================================

alter table profit_sharing_details
  add column if not exists tanggal_dicairkan date,
  add column if not exists bukti_transfer_url text;

-- ---------------------------------------------------------------------
-- Proses pencairan dana bagi hasil ke satu investor untuk satu unit.
-- Membuat entri ledger PENARIKAN sejumlah bagi_hasil (BUKAN modal_kembali
-- — modal pokok tetap di saldo, siap dipakai lagi), lalu menandai baris
-- profit_sharing_details ini sudah dicairkan.
-- ---------------------------------------------------------------------
create or replace function proses_pencairan_dana(
  p_detail_id uuid,
  p_tanggal date default current_date,
  p_bukti_url text default null
)
returns void
language plpgsql
as $$
declare
  v_detail profit_sharing_details%rowtype;
  v_car_label text;
  v_ps profit_sharings%rowtype;
begin
  select * into v_detail from profit_sharing_details where id = p_detail_id;
  if not found then
    raise exception 'Data bagi hasil tidak ditemukan';
  end if;
  if v_detail.tanggal_dicairkan is not null then
    raise exception 'Dana ini sudah pernah dicairkan';
  end if;
  if v_detail.bagi_hasil <= 0 then
    raise exception 'Tidak ada dana bagi hasil positif untuk dicairkan pada baris ini (unit rugi tidak perlu dicairkan)';
  end if;

  select * into v_ps from profit_sharings where id = v_detail.profit_sharing_id;
  if v_ps.is_reversed then
    raise exception 'Bagi hasil ini sudah dibatalkan, tidak bisa dicairkan';
  end if;

  select merek || ' ' || tipe || ' ' || tahun into v_car_label from cars where id = v_ps.car_id;

  insert into investor_ledger (investor_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values (
    v_detail.investor_id,
    'PENARIKAN',
    -v_detail.bagi_hasil,
    'Pencairan bagi hasil ' || coalesce(v_car_label, 'unit'),
    'profit_sharing_details',
    p_detail_id,
    p_tanggal
  );

  update profit_sharing_details
  set sudah_ditransfer = true,
      tanggal_dicairkan = p_tanggal,
      bukti_transfer_url = p_bukti_url
  where id = p_detail_id;
end;
$$;
