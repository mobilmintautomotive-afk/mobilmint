-- =====================================================================
-- MIGRASI UPDATE — dari "Dashboard Trading Mobil 2026 Updated (1).xlsx" (24 Agu 2026)
-- Delta terhadap update sebelumnya (22 Agu):
--   - Surya - Nissan Xtrail 2.5 XT 2011: baru laku terjual (22 Agu @ Rp93.000.000)
--   - Wawan - Honda CRV 2.4 2007: koreksi biaya perbaikan 1.900.000 -> 3.300.000
-- Mercedes Benz C180 (Rosyid) sudah ada di sistem (tahun 2004, dikonfirmasi
-- sebelumnya) — masih muncul "unparseable" di file karena teks sumbernya
-- memang tanpa tahun, bukan berarti belum masuk.
-- =====================================================================

begin;

-- Wawan - Honda CRV 2.4 2007: biaya perbaikan 1.900.000 -> 3.300.000 (+350rb/kategori)
do $$
declare
  v_car uuid := 'ed22d783-da9a-4049-8b97-0b2b38a51dc6';
  v_investor uuid := '99999999-0000-4000-8000-000000000008';
  v_delta numeric := 1400000;
  v_contract uuid := '92cbd8a9-0da4-446f-943f-e108c3fc9566';
begin
  update repairs set biaya = biaya + 350000 where car_id = v_car;
  update car_fundings set amount = amount + v_delta where car_id = v_car and investor_id = v_investor;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values (v_investor, v_contract, 'ALOKASI_MODAL', -v_delta, 'Koreksi biaya perbaikan Honda CRV 2.4 2007', 'cars', v_car, current_date);
end $$;

-- Surya - Nissan Xtrail 2.5 XT 2011: laku 22 Agu 2026 @ Rp93.000.000
do $$
declare
  v_car uuid := 'df0afac8-d8cc-420f-8167-5fd366bfa0c5';
  v_hpp numeric;
  v_sale uuid;
begin
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-08-22'), v_car, date '2026-08-22', 93000000, 0, 0, v_hpp, 93000000 - v_hpp, 93000000 - v_hpp, 'TRANSFER', 'Migrasi update data 24 Agustus 2026')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-08-22');
end $$;

commit;

-- Settle bagi hasil baru ini juga (konsisten dengan kebijakan: semua
-- penjualan langsung ditransfer sesuai tanggal jual).
begin;
do $$
declare r record;
begin
  for r in
    select psd.id, ps.tanggal_proses
    from profit_sharing_details psd
    join profit_sharings ps on ps.id = psd.profit_sharing_id
    where psd.sudah_ditransfer = false and psd.bagi_hasil > 0 and not ps.is_reversed
  loop
    perform proses_pencairan_dana(r.id, r.tanggal_proses, null);
  end loop;
end $$;
commit;
