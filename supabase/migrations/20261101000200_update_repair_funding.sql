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
