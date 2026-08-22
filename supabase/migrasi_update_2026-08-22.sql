-- =====================================================================
-- MIGRASI UPDATE — dari "Dashboard Trading Mobil 2026 Updated.xlsx" (22 Agu 2026)
-- Delta terhadap data yang sudah live (hasil update 20 Agu 2026):
--   - 3 koreksi biaya_lain pada unit yang sudah ada (Johan C200, Defri i20,
--     Habib Teana), tidak ada perubahan lain selain biaya.
--   - Wawan Honda Mobilio 2014: koreksi biaya SEKALIGUS baru laku terjual.
--   - 1 unit baru dibeli: Wawan - Honda CRV 2.4 2007.
-- Urutan penting: koreksi+jual Mobilio dulu (modal kembali) baru beli CRV,
-- supaya saldo Wawan cukup (modal masuk dari penjualan menutupi pembelian).
-- Dilewati: Mercedes Benz C180 (Rosyid) — masih tanpa tahun di sumber.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Koreksi biaya (tidak dijual di batch ini)
-- ---------------------------------------------------------------------

-- Johan - Mercedes Benz C200 2008 (2026-07-26): 15.420.000 -> 18.120.000
do $$
declare
  v_purchase uuid := '1e6cad6d-417b-429e-b759-e93dfc1fa605';
  v_car uuid := 'a75d0062-db0c-4480-81af-8085b6964b24';
  v_investor uuid := '99999999-0000-4000-8000-000000000004';
  v_delta numeric := 2700000;
  v_contract uuid;
  v_tgl date;
begin
  update purchases set biaya_lain = 18120000,
    rincian_biaya_lain = '[{"nama":"Biaya tambahan (data migrasi)","nominal":18120000}]'::jsonb
  where id = v_purchase returning tanggal_beli into v_tgl;
  update car_fundings set amount = amount + v_delta where car_id = v_car and investor_id = v_investor;
  select contract_id into v_contract from car_fundings where car_id = v_car and investor_id = v_investor;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values (v_investor, v_contract, 'ALOKASI_MODAL', -v_delta, 'Koreksi biaya tambahan pembelian Mercedes Benz C200 2008', 'purchases', v_purchase, v_tgl);
end $$;

-- Defri - Hyundai i20 2009 (2026-07-31): 7.580.000 -> 9.880.000
do $$
declare
  v_purchase uuid := '6f67e511-eaaa-42a7-af33-4b32da02c52e';
  v_car uuid := 'f0e28120-2692-4c8b-b560-ff34ed8372bb';
  v_investor uuid := '99999999-0000-4000-8000-000000000006';
  v_delta numeric := 2300000;
  v_contract uuid;
  v_tgl date;
begin
  update purchases set biaya_lain = 9880000,
    rincian_biaya_lain = '[{"nama":"Biaya tambahan (data migrasi)","nominal":9880000}]'::jsonb
  where id = v_purchase returning tanggal_beli into v_tgl;
  update car_fundings set amount = amount + v_delta where car_id = v_car and investor_id = v_investor;
  select contract_id into v_contract from car_fundings where car_id = v_car and investor_id = v_investor;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values (v_investor, v_contract, 'ALOKASI_MODAL', -v_delta, 'Koreksi biaya tambahan pembelian Hyundai i20 2009', 'purchases', v_purchase, v_tgl);
end $$;

-- Habib - Nissan Teana 2013 (2026-07-06): 6.875.000 -> 7.925.000
do $$
declare
  v_purchase uuid := 'da3ba6c5-44be-4ab7-ac6c-78d3bf5f65bd';
  v_car uuid := 'fb989790-a7a0-4413-9619-5faebdce6960';
  v_investor uuid := '99999999-0000-4000-8000-000000000009';
  v_delta numeric := 1050000;
  v_contract uuid;
  v_tgl date;
begin
  update purchases set biaya_lain = 7925000,
    rincian_biaya_lain = '[{"nama":"Biaya tambahan (data migrasi)","nominal":7925000}]'::jsonb
  where id = v_purchase returning tanggal_beli into v_tgl;
  update car_fundings set amount = amount + v_delta where car_id = v_car and investor_id = v_investor;
  select contract_id into v_contract from car_fundings where car_id = v_car and investor_id = v_investor;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values (v_investor, v_contract, 'ALOKASI_MODAL', -v_delta, 'Koreksi biaya tambahan pembelian Nissan Teana 2013', 'purchases', v_purchase, v_tgl);
end $$;

-- ---------------------------------------------------------------------
-- Koreksi biaya + baru laku terjual
-- ---------------------------------------------------------------------

-- Wawan - Honda Mobilio 2014 (beli 2026-06-02): 7.470.000 -> 9.840.000, laku 2026-08-21 @ 112.000.000
do $$
declare
  v_purchase uuid := '44f57ba3-85a5-4236-8cfe-655581e332c4';
  v_car uuid := 'f159aa46-09b7-40d5-babf-83f0136a6a99';
  v_investor uuid := '99999999-0000-4000-8000-000000000008';
  v_delta numeric := 2370000;
  v_contract uuid;
  v_tgl date;
  v_hpp numeric;
  v_sale uuid;
begin
  update purchases set biaya_lain = 9840000,
    rincian_biaya_lain = '[{"nama":"Biaya tambahan (data migrasi)","nominal":9840000}]'::jsonb
  where id = v_purchase returning tanggal_beli into v_tgl;
  update car_fundings set amount = amount + v_delta where car_id = v_car and investor_id = v_investor;
  select contract_id into v_contract from car_fundings where car_id = v_car and investor_id = v_investor;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values (v_investor, v_contract, 'ALOKASI_MODAL', -v_delta, 'Koreksi biaya tambahan pembelian Honda Mobilio 2014', 'purchases', v_purchase, v_tgl);

  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-08-21'), v_car, date '2026-08-21', 112000000, 0, 0, v_hpp, 112000000 - v_hpp, 112000000 - v_hpp, 'TRANSFER', 'Migrasi update data 22 Agustus 2026')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-08-21');
end $$;

-- ---------------------------------------------------------------------
-- Unit baru (baru dibeli, belum laku) — setelah penjualan Mobilio supaya
-- modal Wawan sudah kembali dulu.
-- ---------------------------------------------------------------------

-- Wawan - Honda CRV 2.4 2007 (2026-08-21)
do $$
declare v_car uuid; v_purchase uuid;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'CRV 2.4', 2007, 'DIBELI', 'Migrasi update data 22 Agustus 2026') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-08-21'), v_car, date '2026-08-21', 78000000, 1900000, '[]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000008', 'amount', 79900000)));
  update cars set status = 'READY_STOCK' where id = v_car;
end $$;

commit;
