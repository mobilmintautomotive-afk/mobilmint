-- =====================================================================
-- MIGRASI — Koreksi 2 unit yang biayanya kelewat saat rename kosmetik
--
-- Ditemukan lewat rekonsiliasi penuh (baris per baris) antara file Excel
-- terbaru vs seluruh data di sistem: Surya (Nissan Xtrail -> "2.5 XT")
-- dan Habib (Honda City -> "VTEC") sempat naik biayanya di file lama,
-- tapi waktu itu cuma tipe-nya yang di-rename, biayanya tidak ikut
-- dikoreksi. Ditemukan karena total HPP sistem beda Rp2.500.000 dari
-- total Excel — setelah ditelusuri per unit, ketemu persis di 2 baris ini.
--
-- Selisih ditambahkan ke record `repairs` (biaya ini sudah direklasifikasi
-- ke situ di migrasi sebelumnya), plus penyesuaian car_fundings & ledger.
-- Habib (on-demand, tidak menahan saldo) di-top-up lagi menutup selisihnya.
-- =====================================================================

begin;

-- Surya - Nissan 2.5 XT 2011: biaya perbaikan 3.440.000 -> 4.440.000
do $$
declare
  v_repair uuid := '1cb40503-16ee-4ada-bca1-2227ae95a020';
  v_car uuid := 'df0afac8-d8cc-420f-8167-5fd366bfa0c5';
  v_investor uuid := '99999999-0000-4000-8000-000000000005';
  v_delta numeric := 1000000;
  v_contract uuid;
begin
  update repairs set biaya = 4440000, deskripsi = 'Akumulasi biaya perbaikan (migrasi data, terkoreksi)'
  where id = v_repair;
  update car_fundings set amount = amount + v_delta where car_id = v_car and investor_id = v_investor;
  select contract_id into v_contract from car_fundings where car_id = v_car and investor_id = v_investor;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values (v_investor, v_contract, 'ALOKASI_MODAL', -v_delta, 'Koreksi biaya perbaikan yang kelewat (Nissan Xtrail 2.5 XT 2011)', 'repairs', v_repair, current_date);
end $$;

-- Habib - Honda VTEC 2005: biaya perbaikan 6.260.000 -> 7.760.000
do $$
declare
  v_repair uuid := 'c64b6ffa-a6ae-4a94-9c45-ca53bce3cca8';
  v_car uuid := '851a3d65-fdf9-4aa3-8188-55426efa87a8';
  v_investor uuid := '99999999-0000-4000-8000-000000000009';
  v_delta numeric := 1500000;
  v_contract uuid;
begin
  update repairs set biaya = 7760000, deskripsi = 'Akumulasi biaya perbaikan (migrasi data, terkoreksi)'
  where id = v_repair;
  update car_fundings set amount = amount + v_delta where car_id = v_car and investor_id = v_investor;
  select contract_id into v_contract from car_fundings where car_id = v_car and investor_id = v_investor;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values (v_investor, v_contract, 'ALOKASI_MODAL', -v_delta, 'Koreksi biaya perbaikan yang kelewat (Honda City VTEC 2005)', 'repairs', v_repair, current_date);
end $$;

-- Habib beroperasi on-demand (tidak menahan saldo) — top-up lagi menutup
-- kekurangan yang baru ketahuan ini, supaya saldo balik ke Rp0.
insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, tanggal)
values (
  '99999999-0000-4000-8000-000000000009',
  '853bed61-94db-496c-969b-20fe7ea6397c',
  'SETORAN',
  1500000,
  'Setoran on-demand — top-up biaya perbaikan Honda City VTEC 2005 yang kelewat tercatat',
  current_date
);

commit;
