-- =====================================================================
-- MIGRASI UPDATE — dari "Dashboard Trading Mobil 2026.xlsx" (20 Agu 2026)
-- Delta terhadap data yang sudah live (hasil migrasi 19 Agu 2026):
--   - 8 koreksi biaya_lain pada unit yang sudah ada (data sumber diperbarui)
--   - 2 dari unit itu sekaligus baru laku terjual (Suzuki SX4-Ari, Grand
--     Livina 2015-Verdi) -> bagi hasil diproses otomatis
--   - 5 unit baru (baru dibeli, belum laku)
--   - 2 rename kosmetik nama tipe (tidak ada perubahan uang)
-- Dilewati: Mercedes Benz C180 (Rosyid) — masih tanpa tahun di sumber,
-- perlu input manual via menu Pembelian setelah tahunnya diketahui.
-- Semua saldo investor sudah dicek cukup, tidak perlu setoran tambahan.
-- Dijalankan SEKALI, bukan bagian dari seed.sql.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Koreksi biaya (tidak dijual di batch ini)
-- ---------------------------------------------------------------------

-- Ari - Mazda CX7 2010 (2026-07-31): 8.050.000 -> 9.550.000
do $$
declare
  v_purchase uuid := '26e33a55-49a4-435b-a0f0-80000888cac2';
  v_car uuid := '8920c77c-93ea-430a-af8c-02c35ab058e0';
  v_investor uuid := '99999999-0000-4000-8000-000000000001';
  v_delta numeric := 1500000;
  v_contract uuid;
  v_tgl date;
begin
  update purchases set biaya_lain = 9550000,
    rincian_biaya_lain = '[{"nama":"Biaya tambahan (data migrasi)","nominal":9550000}]'::jsonb
  where id = v_purchase returning tanggal_beli into v_tgl;
  update car_fundings set amount = amount + v_delta where car_id = v_car and investor_id = v_investor;
  select contract_id into v_contract from car_fundings where car_id = v_car and investor_id = v_investor;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values (v_investor, v_contract, 'ALOKASI_MODAL', -v_delta, 'Koreksi biaya tambahan pembelian Mazda CX7 2010', 'purchases', v_purchase, v_tgl);
end $$;

-- Johan - Mercedes Benz C200 2008 (2026-07-26): 13.920.000 -> 15.420.000
do $$
declare
  v_purchase uuid := '1e6cad6d-417b-429e-b759-e93dfc1fa605';
  v_car uuid := 'a75d0062-db0c-4480-81af-8085b6964b24';
  v_investor uuid := '99999999-0000-4000-8000-000000000004';
  v_delta numeric := 1500000;
  v_contract uuid;
  v_tgl date;
begin
  update purchases set biaya_lain = 15420000,
    rincian_biaya_lain = '[{"nama":"Biaya tambahan (data migrasi)","nominal":15420000}]'::jsonb
  where id = v_purchase returning tanggal_beli into v_tgl;
  update car_fundings set amount = amount + v_delta where car_id = v_car and investor_id = v_investor;
  select contract_id into v_contract from car_fundings where car_id = v_car and investor_id = v_investor;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values (v_investor, v_contract, 'ALOKASI_MODAL', -v_delta, 'Koreksi biaya tambahan pembelian Mercedes Benz C200 2008', 'purchases', v_purchase, v_tgl);
end $$;

-- Defri - Hyundai i20 2009 (2026-07-31): 2.400.000 -> 7.580.000
do $$
declare
  v_purchase uuid := '6f67e511-eaaa-42a7-af33-4b32da02c52e';
  v_car uuid := 'f0e28120-2692-4c8b-b560-ff34ed8372bb';
  v_investor uuid := '99999999-0000-4000-8000-000000000006';
  v_delta numeric := 5180000;
  v_contract uuid;
  v_tgl date;
begin
  update purchases set biaya_lain = 7580000,
    rincian_biaya_lain = '[{"nama":"Biaya tambahan (data migrasi)","nominal":7580000}]'::jsonb
  where id = v_purchase returning tanggal_beli into v_tgl;
  update car_fundings set amount = amount + v_delta where car_id = v_car and investor_id = v_investor;
  select contract_id into v_contract from car_fundings where car_id = v_car and investor_id = v_investor;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values (v_investor, v_contract, 'ALOKASI_MODAL', -v_delta, 'Koreksi biaya tambahan pembelian Hyundai i20 2009', 'purchases', v_purchase, v_tgl);
end $$;

-- Habib - Honda CRV 2009 (2026-08-06): 500.000 -> 5.050.000
do $$
declare
  v_purchase uuid := '2b41ea73-8f1b-45f9-b4ad-747ec4c7ca1c';
  v_car uuid := '8107b76f-48fa-45d1-8429-b31a284d539a';
  v_investor uuid := '99999999-0000-4000-8000-000000000009';
  v_delta numeric := 4550000;
  v_contract uuid;
  v_tgl date;
begin
  update purchases set biaya_lain = 5050000,
    rincian_biaya_lain = '[{"nama":"Biaya tambahan (data migrasi)","nominal":5050000}]'::jsonb
  where id = v_purchase returning tanggal_beli into v_tgl;
  update car_fundings set amount = amount + v_delta where car_id = v_car and investor_id = v_investor;
  select contract_id into v_contract from car_fundings where car_id = v_car and investor_id = v_investor;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values (v_investor, v_contract, 'ALOKASI_MODAL', -v_delta, 'Koreksi biaya tambahan pembelian Honda CRV 2009', 'purchases', v_purchase, v_tgl);
end $$;

-- Habib - Toyota Camry V 2010 (2026-08-01): 7.500.000 -> 13.525.000
do $$
declare
  v_purchase uuid := '8569c749-95c3-4c24-861b-783beb64abf0';
  v_car uuid := 'd56cc435-a6f6-4417-8947-ab30c169a1ea';
  v_investor uuid := '99999999-0000-4000-8000-000000000009';
  v_delta numeric := 6025000;
  v_contract uuid;
  v_tgl date;
begin
  update purchases set biaya_lain = 13525000,
    rincian_biaya_lain = '[{"nama":"Biaya tambahan (data migrasi)","nominal":13525000}]'::jsonb
  where id = v_purchase returning tanggal_beli into v_tgl;
  update car_fundings set amount = amount + v_delta where car_id = v_car and investor_id = v_investor;
  select contract_id into v_contract from car_fundings where car_id = v_car and investor_id = v_investor;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values (v_investor, v_contract, 'ALOKASI_MODAL', -v_delta, 'Koreksi biaya tambahan pembelian Toyota Camry V 2010', 'purchases', v_purchase, v_tgl);
end $$;

-- Habib - Mazda2 Skyactive 2016 (2026-08-03): 10.105.000 -> 12.795.000
do $$
declare
  v_purchase uuid := '73635a1b-5ce0-4762-aa38-cd262cba6ad8';
  v_car uuid := '0d1aae85-6476-48be-827f-5b7d2cf38070';
  v_investor uuid := '99999999-0000-4000-8000-000000000009';
  v_delta numeric := 2690000;
  v_contract uuid;
  v_tgl date;
begin
  update purchases set biaya_lain = 12795000,
    rincian_biaya_lain = '[{"nama":"Biaya tambahan (data migrasi)","nominal":12795000}]'::jsonb
  where id = v_purchase returning tanggal_beli into v_tgl;
  update car_fundings set amount = amount + v_delta where car_id = v_car and investor_id = v_investor;
  select contract_id into v_contract from car_fundings where car_id = v_car and investor_id = v_investor;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values (v_investor, v_contract, 'ALOKASI_MODAL', -v_delta, 'Koreksi biaya tambahan pembelian Mazda2 Skyactive 2016', 'purchases', v_purchase, v_tgl);
end $$;

-- ---------------------------------------------------------------------
-- Koreksi biaya + baru laku terjual
-- ---------------------------------------------------------------------

-- Ari - Suzuki SX4 2008 (beli 2026-08-07): 12.300.000 -> 19.870.000, laku 2026-08-14 @ 85.000.000
do $$
declare
  v_purchase uuid := 'd7438c46-fa9a-4862-bea5-9f2689f419d5';
  v_car uuid := '6f04f1e5-20bf-4a3f-99a1-9bd96b1d793f';
  v_investor uuid := '99999999-0000-4000-8000-000000000001';
  v_delta numeric := 7570000;
  v_contract uuid;
  v_tgl date;
  v_hpp numeric;
  v_sale uuid;
begin
  update purchases set biaya_lain = 19870000,
    rincian_biaya_lain = '[{"nama":"Biaya tambahan (data migrasi)","nominal":19870000}]'::jsonb
  where id = v_purchase returning tanggal_beli into v_tgl;
  update car_fundings set amount = amount + v_delta where car_id = v_car and investor_id = v_investor;
  select contract_id into v_contract from car_fundings where car_id = v_car and investor_id = v_investor;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values (v_investor, v_contract, 'ALOKASI_MODAL', -v_delta, 'Koreksi biaya tambahan pembelian Suzuki SX4 2008', 'purchases', v_purchase, v_tgl);

  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-08-14'), v_car, date '2026-08-14', 85000000, 0, 0, v_hpp, 85000000 - v_hpp, 85000000 - v_hpp, 'TRANSFER', 'Migrasi update data Agustus 2026')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-08-14');
end $$;

-- Verdi - Nissan Grand Livina 2015 (beli 2026-07-14): 25.190.000 -> 25.690.000, laku 2026-08-08 @ 98.000.000
do $$
declare
  v_purchase uuid := '590002aa-984a-45f8-ae8f-3ddc214470b9';
  v_car uuid := '73ede792-0fc7-4d11-813f-668cb00da8f9';
  v_investor uuid := '99999999-0000-4000-8000-000000000007';
  v_delta numeric := 500000;
  v_contract uuid;
  v_tgl date;
  v_hpp numeric;
  v_sale uuid;
begin
  update purchases set biaya_lain = 25690000,
    rincian_biaya_lain = '[{"nama":"Biaya tambahan (data migrasi)","nominal":25690000}]'::jsonb
  where id = v_purchase returning tanggal_beli into v_tgl;
  update car_fundings set amount = amount + v_delta where car_id = v_car and investor_id = v_investor;
  select contract_id into v_contract from car_fundings where car_id = v_car and investor_id = v_investor;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values (v_investor, v_contract, 'ALOKASI_MODAL', -v_delta, 'Koreksi biaya tambahan pembelian Nissan Grand Livina 2015', 'purchases', v_purchase, v_tgl);

  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-08-08'), v_car, date '2026-08-08', 98000000, 0, 0, v_hpp, 98000000 - v_hpp, 98000000 - v_hpp, 'TRANSFER', 'Migrasi update data Agustus 2026')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-08-08');
end $$;

-- ---------------------------------------------------------------------
-- Unit baru (baru dibeli, belum laku)
-- ---------------------------------------------------------------------

-- Ari - Honda Jazz VTEC 2008 (2026-08-15)
do $$
declare v_car uuid; v_purchase uuid;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'Jazz VTEC', 2008, 'DIBELI', 'Migrasi update data Agustus 2026') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-08-15'), v_car, date '2026-08-15', 71000000, 5120000, '[]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 76120000)));
  update cars set status = 'READY_STOCK' where id = v_car;
end $$;

-- Ari - Nissan Grand Livina 2013 (2026-08-15) -- merek diasumsikan Nissan (nameplate eksklusif Nissan)
do $$
declare v_car uuid; v_purchase uuid;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Nissan', 'Grand Livina', 2013, 'DIBELI', 'Migrasi update data Agustus 2026') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-08-15'), v_car, date '2026-08-15', 68000000, 3900000, '[]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 71900000)));
  update cars set status = 'READY_STOCK' where id = v_car;
end $$;

-- Verdi - Nissan XTrail ST 2010 (2026-08-11)
do $$
declare v_car uuid; v_purchase uuid;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Nissan', 'Xtrail ST', 2010, 'DIBELI', 'Migrasi update data Agustus 2026') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-08-11'), v_car, date '2026-08-11', 62000000, 1900000, '[]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000007', 'amount', 63900000)));
  update cars set status = 'READY_STOCK' where id = v_car;
end $$;

-- Habib - Honda CRV 2.4 2008 (2026-08-11)
do $$
declare v_car uuid; v_purchase uuid;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'CRV 2.4', 2008, 'DIBELI', 'Migrasi update data Agustus 2026') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-08-11'), v_car, date '2026-08-11', 88000000, 5800000, '[]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000009', 'amount', 93800000)));
  update cars set status = 'READY_STOCK' where id = v_car;
end $$;

-- Habib - Toyota Camry G 2010 (2026-08-14)
do $$
declare v_car uuid; v_purchase uuid;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Toyota', 'Camry G', 2010, 'DIBELI', 'Migrasi update data Agustus 2026') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-08-14'), v_car, date '2026-08-14', 80000000, 4470000, '[]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000009', 'amount', 84470000)));
  update cars set status = 'READY_STOCK' where id = v_car;
end $$;

-- ---------------------------------------------------------------------
-- Rename kosmetik (nama tipe lebih detail di sumber, tidak ada perubahan uang)
-- ---------------------------------------------------------------------
update cars set tipe = '2.5 XT' where id = 'df0afac8-d8cc-420f-8167-5fd366bfa0c5'; -- Surya, Nissan Xtrail 2011
update cars set tipe = 'VTEC' where id = '851a3d65-fdf9-4aa3-8188-55426efa87a8'; -- Habib, Honda City 2005

commit;
