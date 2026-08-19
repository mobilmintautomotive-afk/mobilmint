-- =====================================================================
-- MIGRASI DATA REAL — dari "Dashboard Trading Mobil 2027 copy.xlsx"
-- Digenerate otomatis dari file Excel, JANGAN diedit manual.
-- Dijalankan SEKALI ke database production, bukan bagian dari seed.sql
-- (seed.sql tetap dummy data untuk dev/demo).
--
-- Asumsi yang diambil (perlu dikoreksi kalau salah):
-- - 15 unit yang belum ada Tanggal Jual di sumber didefault READY_STOCK.
-- - Kolom "Biaya" dari sumber (lelang, mutasi, dll — tidak dirinci) masuk
--   sebagai satu baris rincian_biaya_lain di pembelian, HPP tetap akurat.
-- - Nomor polisi, supplier, customer, sales tidak ada di sumber -> kosong.
-- - Setoran (ledger) tiap investor dihitung dari kebutuhan modal puncak
--   histori transaksinya sendiri + buffer 15% -- BUKAN dari "Sisa Budget"
--   di sumber yang sudah terbukti tidak reliable (lihat catatan analisa).
--   nilai_investasi (plafon akad) tetap angka yang dikonfirmasi user.
--   * Ari: setoran riil Rp 430.000.000 > plafon Rp 375.000.000 (kebutuhan riil lebih besar dari plafon yang dikonfirmasi)
--   * Azka: setoran riil Rp 170.000.000 > plafon Rp 85.000.000 (kebutuhan riil lebih besar dari plafon yang dikonfirmasi)
--   * Rosyid: setoran riil Rp 152.000.000 > plafon Rp 100.000.000 (kebutuhan riil lebih besar dari plafon yang dikonfirmasi)
--   * Johan: setoran riil Rp 126.000.000 > plafon Rp 100.000.000 (kebutuhan riil lebih besar dari plafon yang dikonfirmasi)
--   * Surya: setoran riil Rp 182.000.000 > plafon Rp 100.000.000 (kebutuhan riil lebih besar dari plafon yang dikonfirmasi)
--   * Defri: setoran riil Rp 121.000.000 > plafon Rp 100.000.000 (kebutuhan riil lebih besar dari plafon yang dikonfirmasi)
--   * Verdi: setoran riil Rp 166.000.000 > plafon Rp 100.000.000 (kebutuhan riil lebih besar dari plafon yang dikonfirmasi)
--   * Wawan: setoran riil Rp 121.000.000 > plafon Rp 100.000.000 (kebutuhan riil lebih besar dari plafon yang dikonfirmasi)
--   * Habib: setoran riil Rp 656.000.000 > plafon Rp 0 (kebutuhan riil lebih besar dari plafon yang dikonfirmasi)
-- - Habib: nilai_investasi akadnya NULL (tanpa batas plafon, sesuai sumber).
-- =====================================================================

begin;

-- Bersihkan data dummy (urutan mengikuti dependensi FK)
truncate table
  cash_ledger, bank_accounts,
  profit_sharing_details, profit_sharings, car_sales, repairs, car_fundings,
  purchases, investor_ledger, investor_contracts, cars, customers,
  sales_persons, vendors, suppliers, profiles, investors,
  operational_expenses, company_assets
restart identity cascade;

-- ---------------------------------------------------------------------
-- Rekening perusahaan (belum ada data rekening asli — placeholder,
-- silakan diedit lewat menu Master > Akun Bank).
-- ---------------------------------------------------------------------
insert into bank_accounts (id, nama, nama_bank, no_rekening, atas_nama, saldo_awal, tanggal_saldo_awal, is_default) values
  ('88888888-0000-4000-8000-000000000001', 'Rekening Operasional', 'BCA', '-', 'PT MobilMint Indonesia', 0, date '2025-12-01', true);

-- ---------------------------------------------------------------------
-- Investor real
-- ---------------------------------------------------------------------
insert into investors (id, nama, is_active) values
  ('99999999-0000-4000-8000-000000000001', 'Ari', true),
  ('99999999-0000-4000-8000-000000000002', 'Azka', true),
  ('99999999-0000-4000-8000-000000000003', 'Rosyid', true),
  ('99999999-0000-4000-8000-000000000004', 'Johan', true),
  ('99999999-0000-4000-8000-000000000005', 'Surya', true),
  ('99999999-0000-4000-8000-000000000006', 'Defri', true),
  ('99999999-0000-4000-8000-000000000007', 'Verdi', true),
  ('99999999-0000-4000-8000-000000000008', 'Wawan', true),
  ('99999999-0000-4000-8000-000000000009', 'Habib', true);

-- ---------------------------------------------------------------------
-- Akun pengguna dev-role (Fase 4)
-- ---------------------------------------------------------------------
insert into profiles (nama, email, role, investor_id) values
  ('Owner MobilMint', 'owner@mobilmint.id', 'admin', null),
  ('Manajer Holding', 'holding@mobilmint.id', 'holding', null);

-- ---------------------------------------------------------------------
-- Akad Investor — nilai & nisbah sesuai kesepakatan real. tanggal_akad
-- diambil dari beberapa hari sebelum transaksi pembelian pertamanya.
-- ---------------------------------------------------------------------
do $$
declare
  v_no text;
  v_cid uuid;
begin
  -- Ari: Rp 375.000.000, nisbah investor 40%
  v_no := fn_next_doc_number('AKD', date '2025-12-14');
  insert into investor_contracts (no_akad, investor_id, nilai_investasi, nisbah_investor_pct, nisbah_pengelola_pct, tanggal_akad, tanggal_dana_diterima, jumlah_diterima, status)
  values (v_no, '99999999-0000-4000-8000-000000000001', 375000000, 40, 60, date '2025-12-14', date '2025-12-14', 430000000, 'AKTIF')
  returning id into v_cid;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values ('99999999-0000-4000-8000-000000000001', v_cid, 'SETORAN', 430000000, 'Setoran investasi — nisbah 40%', 'investor_contracts', v_cid, date '2025-12-14');

  -- Azka: Rp 85.000.000, nisbah investor 40%
  v_no := fn_next_doc_number('AKD', date '2025-12-26');
  insert into investor_contracts (no_akad, investor_id, nilai_investasi, nisbah_investor_pct, nisbah_pengelola_pct, tanggal_akad, tanggal_dana_diterima, jumlah_diterima, status)
  values (v_no, '99999999-0000-4000-8000-000000000002', 85000000, 40, 60, date '2025-12-26', date '2025-12-26', 170000000, 'AKTIF')
  returning id into v_cid;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values ('99999999-0000-4000-8000-000000000002', v_cid, 'SETORAN', 170000000, 'Setoran investasi — nisbah 40%', 'investor_contracts', v_cid, date '2025-12-26');

  -- Rosyid: Rp 100.000.000, nisbah investor 30%
  v_no := fn_next_doc_number('AKD', date '2026-01-14');
  insert into investor_contracts (no_akad, investor_id, nilai_investasi, nisbah_investor_pct, nisbah_pengelola_pct, tanggal_akad, tanggal_dana_diterima, jumlah_diterima, status)
  values (v_no, '99999999-0000-4000-8000-000000000003', 100000000, 30, 70, date '2026-01-14', date '2026-01-14', 152000000, 'AKTIF')
  returning id into v_cid;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values ('99999999-0000-4000-8000-000000000003', v_cid, 'SETORAN', 152000000, 'Setoran investasi — nisbah 30%', 'investor_contracts', v_cid, date '2026-01-14');

  -- Johan: Rp 100.000.000, nisbah investor 30%
  v_no := fn_next_doc_number('AKD', date '2026-02-15');
  insert into investor_contracts (no_akad, investor_id, nilai_investasi, nisbah_investor_pct, nisbah_pengelola_pct, tanggal_akad, tanggal_dana_diterima, jumlah_diterima, status)
  values (v_no, '99999999-0000-4000-8000-000000000004', 100000000, 30, 70, date '2026-02-15', date '2026-02-15', 126000000, 'AKTIF')
  returning id into v_cid;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values ('99999999-0000-4000-8000-000000000004', v_cid, 'SETORAN', 126000000, 'Setoran investasi — nisbah 30%', 'investor_contracts', v_cid, date '2026-02-15');

  -- Surya: Rp 100.000.000, nisbah investor 30%
  v_no := fn_next_doc_number('AKD', date '2026-03-09');
  insert into investor_contracts (no_akad, investor_id, nilai_investasi, nisbah_investor_pct, nisbah_pengelola_pct, tanggal_akad, tanggal_dana_diterima, jumlah_diterima, status)
  values (v_no, '99999999-0000-4000-8000-000000000005', 100000000, 30, 70, date '2026-03-09', date '2026-03-09', 182000000, 'AKTIF')
  returning id into v_cid;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values ('99999999-0000-4000-8000-000000000005', v_cid, 'SETORAN', 182000000, 'Setoran investasi — nisbah 30%', 'investor_contracts', v_cid, date '2026-03-09');

  -- Defri: Rp 100.000.000, nisbah investor 30%
  v_no := fn_next_doc_number('AKD', date '2026-04-16');
  insert into investor_contracts (no_akad, investor_id, nilai_investasi, nisbah_investor_pct, nisbah_pengelola_pct, tanggal_akad, tanggal_dana_diterima, jumlah_diterima, status)
  values (v_no, '99999999-0000-4000-8000-000000000006', 100000000, 30, 70, date '2026-04-16', date '2026-04-16', 121000000, 'AKTIF')
  returning id into v_cid;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values ('99999999-0000-4000-8000-000000000006', v_cid, 'SETORAN', 121000000, 'Setoran investasi — nisbah 30%', 'investor_contracts', v_cid, date '2026-04-16');

  -- Verdi: Rp 100.000.000, nisbah investor 30%
  v_no := fn_next_doc_number('AKD', date '2026-05-25');
  insert into investor_contracts (no_akad, investor_id, nilai_investasi, nisbah_investor_pct, nisbah_pengelola_pct, tanggal_akad, tanggal_dana_diterima, jumlah_diterima, status)
  values (v_no, '99999999-0000-4000-8000-000000000007', 100000000, 30, 70, date '2026-05-25', date '2026-05-25', 166000000, 'AKTIF')
  returning id into v_cid;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values ('99999999-0000-4000-8000-000000000007', v_cid, 'SETORAN', 166000000, 'Setoran investasi — nisbah 30%', 'investor_contracts', v_cid, date '2026-05-25');

  -- Wawan: Rp 100.000.000, nisbah investor 30%
  v_no := fn_next_doc_number('AKD', date '2026-05-28');
  insert into investor_contracts (no_akad, investor_id, nilai_investasi, nisbah_investor_pct, nisbah_pengelola_pct, tanggal_akad, tanggal_dana_diterima, jumlah_diterima, status)
  values (v_no, '99999999-0000-4000-8000-000000000008', 100000000, 30, 70, date '2026-05-28', date '2026-05-28', 121000000, 'AKTIF')
  returning id into v_cid;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values ('99999999-0000-4000-8000-000000000008', v_cid, 'SETORAN', 121000000, 'Setoran investasi — nisbah 30%', 'investor_contracts', v_cid, date '2026-05-28');

  -- Habib: tanpa batas (Unlimited), nisbah investor 40%
  v_no := fn_next_doc_number('AKD', date '2026-07-01');
  insert into investor_contracts (no_akad, investor_id, nilai_investasi, nisbah_investor_pct, nisbah_pengelola_pct, tanggal_akad, tanggal_dana_diterima, jumlah_diterima, status)
  values (v_no, '99999999-0000-4000-8000-000000000009', null, 40, 60, date '2026-07-01', date '2026-07-01', 656000000, 'AKTIF')
  returning id into v_cid;
  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values ('99999999-0000-4000-8000-000000000009', v_cid, 'SETORAN', 656000000, 'Setoran investasi — nisbah 40%', 'investor_contracts', v_cid, date '2026-07-01');

end $$;

-- ---------------------------------------------------------------------
-- Tabel sementara: jembatan antar blok BELI dan JUAL supaya urutan
-- kronologis lintas transaksi per investor terjaga (modal kembali dulu
-- sebelum dipakai beli unit berikutnya, sama seperti kejadian aslinya).
-- ---------------------------------------------------------------------
create temp table _migrasi_map (trx_id text primary key, car_id uuid, hpp numeric) on commit drop;

-- ---------------------------------------------------------------------
-- 83 transaksi (69 sudah terjual, 14 masih stok),
-- ditulis sebagai urutan event kronologis lintas semua investor.
-- ---------------------------------------------------------------------
-- [BELI] Ari — Nissan XTrail XT 2010 (2025-12-19)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Nissan', 'XTrail XT', 2010, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2025-12-19'), v_car, date '2025-12-19', 70000000, 3000000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":3000000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 73000000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx1', v_car, v_hpp);
end $$;

-- [BELI] Azka — Honda Civic 2002 (2025-12-31)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'Civic', 2002, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2025-12-31'), v_car, date '2025-12-31', 50000000, 5510000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":5510000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000002', 'amount', 55510000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx32', v_car, v_hpp);
end $$;

-- [BELI] Ari — Toyota Yaris S Limited 2006 (2025-12-31)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Toyota', 'Yaris S Limited', 2006, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2025-12-31'), v_car, date '2025-12-31', 61500000, 6500000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":6500000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 68000000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx2', v_car, v_hpp);
end $$;

-- [JUAL] Ari — Nissan XTrail XT 2010 (2025-12-31)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx1';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2025-12-31'), v_car, date '2025-12-31', 80000000, 0, 0, v_hpp, 80000000-v_hpp, 80000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2025-12-31');
end $$;

-- [JUAL] Ari — Toyota Yaris S Limited 2006 (2026-01-08)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx2';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-01-08'), v_car, date '2026-01-08', 78000000, 0, 0, v_hpp, 78000000-v_hpp, 78000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-01-08');
end $$;

-- [BELI] Azka — Toyota Kijang LGX 1997 (2026-01-09)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Toyota', 'Kijang LGX', 1997, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-01-09'), v_car, date '2026-01-09', 34000000, 8860000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":8860000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000002', 'amount', 42860000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx33', v_car, v_hpp);
end $$;

-- [BELI] Ari — Nissan Grand Livina XV 2012 (2026-01-09)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Nissan', 'Grand Livina XV', 2012, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-01-09'), v_car, date '2026-01-09', 59000000, 4250000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":4250000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 63250000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx3', v_car, v_hpp);
end $$;

-- [BELI] Ari — Hyundai Getz 2003 (2026-01-14)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Hyundai', 'Getz', 2003, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-01-14'), v_car, date '2026-01-14', 47000000, 2950000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":2950000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 49950000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx4', v_car, v_hpp);
end $$;

-- [BELI] Rosyid — Mazda 2 R 2012 (2026-01-19)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Mazda', '2 R', 2012, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-01-19'), v_car, date '2026-01-19', 79000000, 2950000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":2950000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000003', 'amount', 81950000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx38', v_car, v_hpp);
end $$;

-- [BELI] Ari — Mazda Biante 2012 (2026-01-19)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Mazda', 'Biante', 2012, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-01-19'), v_car, date '2026-01-19', 86000000, 10400000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":10400000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 96400000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx5', v_car, v_hpp);
end $$;

-- [JUAL] Ari — Nissan Grand Livina XV 2012 (2026-01-24)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx3';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-01-24'), v_car, date '2026-01-24', 72000000, 0, 0, v_hpp, 72000000-v_hpp, 72000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-01-24');
end $$;

-- [JUAL] Ari — Hyundai Getz 2003 (2026-01-27)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx4';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-01-27'), v_car, date '2026-01-27', 56500000, 0, 0, v_hpp, 56500000-v_hpp, 56500000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-01-27');
end $$;

-- [BELI] Ari — Honda CRV 2009 (2026-01-29)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'CRV', 2009, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-01-29'), v_car, date '2026-01-29', 76000000, 3306000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":3306000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 79306000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx6', v_car, v_hpp);
end $$;

-- [JUAL] Rosyid — Mazda 2 R 2012 (2026-02-04)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx38';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-02-04'), v_car, date '2026-02-04', 85000000, 0, 0, v_hpp, 85000000-v_hpp, 85000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-02-04');
end $$;

-- [JUAL] Ari — Mazda Biante 2012 (2026-02-05)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx5';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-02-05'), v_car, date '2026-02-05', 102000000, 0, 0, v_hpp, 102000000-v_hpp, 102000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-02-05');
end $$;

-- [JUAL] Azka — Honda Civic 2002 (2026-02-05)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx32';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-02-05'), v_car, date '2026-02-05', 58500000, 0, 0, v_hpp, 58500000-v_hpp, 58500000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-02-05');
end $$;

-- [BELI] Rosyid — Hyundai Avega 2007 (2026-02-06)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Hyundai', 'Avega', 2007, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-02-06'), v_car, date '2026-02-06', 34500000, 0, '[]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000003', 'amount', 34500000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx39', v_car, v_hpp);
end $$;

-- [BELI] Ari — Nissan Grand Livina 2012 (2026-02-06)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Nissan', 'Grand Livina', 2012, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-02-06'), v_car, date '2026-02-06', 66000000, 3450000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":3450000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 69450000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx7', v_car, v_hpp);
end $$;

-- [JUAL] Rosyid — Hyundai Avega 2007 (2026-02-08)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx39';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-02-08'), v_car, date '2026-02-08', 41500000, 0, 0, v_hpp, 41500000-v_hpp, 41500000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-02-08');
end $$;

-- [JUAL] Ari — Honda CRV 2009 (2026-02-11)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx6';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-02-11'), v_car, date '2026-02-11', 85000000, 0, 0, v_hpp, 85000000-v_hpp, 85000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-02-11');
end $$;

-- [BELI] Ari — Toyota Ist 2003 (2026-02-16)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Toyota', 'Ist', 2003, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-02-16'), v_car, date '2026-02-16', 60000000, 7345000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":7345000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 67345000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx14', v_car, v_hpp);
end $$;

-- [BELI] Johan — Mercedes Benz c240 2002 (2026-02-20)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Mercedes Benz', 'c240', 2002, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-02-20'), v_car, date '2026-02-20', 53500000, 4000000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":4000000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000004', 'amount', 57500000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx48', v_car, v_hpp);
end $$;

-- [BELI] Ari — Honda Jazz 2004 (2026-02-20)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'Jazz', 2004, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-02-20'), v_car, date '2026-02-20', 54000000, 0, '[]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 54000000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx8', v_car, v_hpp);
end $$;

-- [JUAL] Ari — Nissan Grand Livina 2012 (2026-02-20)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx7';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-02-20'), v_car, date '2026-02-20', 75000000, 0, 0, v_hpp, 75000000-v_hpp, 75000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-02-20');
end $$;

-- [JUAL] Ari — Honda Jazz 2004 (2026-02-21)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx8';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-02-21'), v_car, date '2026-02-21', 63000000, 0, 0, v_hpp, 63000000-v_hpp, 63000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-02-21');
end $$;

-- [BELI] Johan — Hyundai Getz 2004 (2026-02-27)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Hyundai', 'Getz', 2004, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-02-27'), v_car, date '2026-02-27', 48500000, 3340000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":3340000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000004', 'amount', 51840000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx49', v_car, v_hpp);
end $$;

-- [BELI] Ari — Nissan Serena HWS 2012 (2026-02-27)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Nissan', 'Serena HWS', 2012, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-02-27'), v_car, date '2026-02-27', 70000000, 0, '[]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 70000000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx9', v_car, v_hpp);
end $$;

-- [JUAL] Ari — Nissan Serena HWS 2012 (2026-02-27)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx9';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-02-27'), v_car, date '2026-02-27', 73000000, 0, 0, v_hpp, 73000000-v_hpp, 73000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-02-27');
end $$;

-- [BELI] Rosyid — Nissan Grand Livina 2011 (2026-02-28)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Nissan', 'Grand Livina', 2011, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-02-28'), v_car, date '2026-02-28', 49500000, 6000000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":6000000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000003', 'amount', 55500000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx41', v_car, v_hpp);
end $$;

-- [BELI] Ari — Nissan XTrail XT 2008 (2026-02-28)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Nissan', 'XTrail XT', 2008, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-02-28'), v_car, date '2026-02-28', 68500000, 4050000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":4050000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 72550000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx10', v_car, v_hpp);
end $$;

-- [JUAL] Johan — Mercedes Benz c240 2002 (2026-02-28)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx48';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-02-28'), v_car, date '2026-02-28', 69000000, 0, 0, v_hpp, 69000000-v_hpp, 69000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-02-28');
end $$;

-- [BELI] Ari — Toyota Alphard V 2006 (2026-03-02)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Toyota', 'Alphard V', 2006, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-03-02'), v_car, date '2026-03-02', 99000000, 6200000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":6200000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 105200000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx13', v_car, v_hpp);
end $$;

-- [BELI] Rosyid — Honda City 2008 (2026-03-03)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'City', 2008, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-03-03'), v_car, date '2026-03-03', 55000000, 2400000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":2400000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000003', 'amount', 57400000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx40', v_car, v_hpp);
end $$;

-- [JUAL] Johan — Hyundai Getz 2004 (2026-03-04)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx49';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-03-04'), v_car, date '2026-03-04', 59000000, 0, 0, v_hpp, 59000000-v_hpp, 59000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-03-04');
end $$;

-- [JUAL] Azka — Toyota Kijang LGX 1997 (2026-03-06)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx33';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-03-06'), v_car, date '2026-03-06', 52000000, 0, 0, v_hpp, 52000000-v_hpp, 52000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-03-06');
end $$;

-- [JUAL] Rosyid — Honda City 2008 (2026-03-06)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx40';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-03-06'), v_car, date '2026-03-06', 66500000, 0, 0, v_hpp, 66500000-v_hpp, 66500000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-03-06');
end $$;

-- [JUAL] Rosyid — Nissan Grand Livina 2011 (2026-03-06)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx41';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-03-06'), v_car, date '2026-03-06', 61500000, 0, 0, v_hpp, 61500000-v_hpp, 61500000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-03-06');
end $$;

-- [BELI] Rosyid — Honda CRV 2011 (2026-03-08)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'CRV', 2011, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-03-08'), v_car, date '2026-03-08', 84000000, 1900000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":1900000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000003', 'amount', 85900000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx42', v_car, v_hpp);
end $$;

-- [BELI] Azka — Toyota Kijang LGX 2000 (2026-03-09)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Toyota', 'Kijang LGX', 2000, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-03-09'), v_car, date '2026-03-09', 52000000, 2100000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":2100000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000002', 'amount', 54100000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx34', v_car, v_hpp);
end $$;

-- [JUAL] Ari — Nissan XTrail XT 2008 (2026-03-09)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx10';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-03-09'), v_car, date '2026-03-09', 83500000, 0, 0, v_hpp, 83500000-v_hpp, 83500000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-03-09');
end $$;

-- [JUAL] Rosyid — Honda CRV 2011 (2026-03-11)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx42';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-03-11'), v_car, date '2026-03-11', 95000000, 0, 0, v_hpp, 95000000-v_hpp, 95000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-03-11');
end $$;

-- [BELI] Johan — Daihatsu Sirion 2013 (2026-03-13)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Daihatsu', 'Sirion', 2013, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-03-13'), v_car, date '2026-03-13', 71800000, 3100000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":3100000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000004', 'amount', 74900000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx50', v_car, v_hpp);
end $$;

-- [BELI] Ari — Chevrolet Captiva 2011 (2026-03-13)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Chevrolet', 'Captiva', 2011, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-03-13'), v_car, date '2026-03-13', 83000000, 3950000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":3950000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 86950000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx11', v_car, v_hpp);
end $$;

-- [BELI] Surya — Nissan Elgrand 2007 (2026-03-14)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Nissan', 'Elgrand', 2007, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-03-14'), v_car, date '2026-03-14', 81500000, 8000000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":8000000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000005', 'amount', 89500000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx58', v_car, v_hpp);
end $$;

-- [JUAL] Ari — Chevrolet Captiva 2011 (2026-03-16)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx11';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-03-16'), v_car, date '2026-03-16', 95000000, 0, 0, v_hpp, 95000000-v_hpp, 95000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-03-16');
end $$;

-- [JUAL] Johan — Daihatsu Sirion 2013 (2026-03-18)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx50';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-03-18'), v_car, date '2026-03-18', 80500000, 0, 0, v_hpp, 80500000-v_hpp, 80500000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-03-18');
end $$;

-- [JUAL] Azka — Toyota Kijang LGX 2000 (2026-03-23)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx34';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-03-23'), v_car, date '2026-03-23', 60000000, 0, 0, v_hpp, 60000000-v_hpp, 60000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-03-23');
end $$;

-- [BELI] Johan — Nissan Grand Livina 2012 (2026-03-31)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Nissan', 'Grand Livina', 2012, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-03-31'), v_car, date '2026-03-31', 60500000, 1200000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":1200000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000004', 'amount', 61700000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx51', v_car, v_hpp);
end $$;

-- [BELI] Azka — Honda CRV 2.0 2010 (2026-03-31)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'CRV 2.0', 2010, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-03-31'), v_car, date '2026-03-31', 82000000, 7216000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":7216000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000002', 'amount', 89216000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx35', v_car, v_hpp);
end $$;

-- [BELI] Ari — Mercedes Benz E240 2003 (2026-03-31)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Mercedes Benz', 'E240', 2003, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-03-31'), v_car, date '2026-03-31', 64000000, 1950000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":1950000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 65950000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx12', v_car, v_hpp);
end $$;

-- [JUAL] Johan — Nissan Grand Livina 2012 (2026-04-02)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx51';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-04-02'), v_car, date '2026-04-02', 74000000, 0, 0, v_hpp, 74000000-v_hpp, 74000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-04-02');
end $$;

-- [BELI] Rosyid — Nissan Serena 2010 (2026-04-04)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Nissan', 'Serena', 2010, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-04-04'), v_car, date '2026-04-04', 65000000, 4030000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":4030000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000003', 'amount', 69030000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx43', v_car, v_hpp);
end $$;

-- [BELI] Johan — Chevrolet Orlando 2014 (2026-04-06)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Chevrolet', 'Orlando', 2014, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-04-06'), v_car, date '2026-04-06', 83000000, 3600000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":3600000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000004', 'amount', 86600000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx52', v_car, v_hpp);
end $$;

-- [JUAL] Ari — Mercedes Benz E240 2003 (2026-04-11)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx12';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-04-11'), v_car, date '2026-04-11', 73000000, 0, 0, v_hpp, 73000000-v_hpp, 73000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-04-11');
end $$;

-- [JUAL] Johan — Chevrolet Orlando 2014 (2026-04-12)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx52';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-04-12'), v_car, date '2026-04-12', 95000000, 0, 0, v_hpp, 95000000-v_hpp, 95000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-04-12');
end $$;

-- [JUAL] Surya — Nissan Elgrand 2007 (2026-04-14)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx58';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-04-14'), v_car, date '2026-04-14', 95000000, 0, 0, v_hpp, 95000000-v_hpp, 95000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-04-14');
end $$;

-- [JUAL] Ari — Toyota Alphard V 2006 (2026-04-15)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx13';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-04-15'), v_car, date '2026-04-15', 110000000, 0, 0, v_hpp, 110000000-v_hpp, 110000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-04-15');
end $$;

-- [JUAL] Ari — Toyota Ist 2003 (2026-04-16)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx14';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-04-16'), v_car, date '2026-04-16', 75000000, 0, 0, v_hpp, 75000000-v_hpp, 75000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-04-16');
end $$;

-- [BELI] Surya — Honda CRV 2009 (2026-04-19)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'CRV', 2009, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-04-19'), v_car, date '2026-04-19', 92500000, 4520000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":4520000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000005', 'amount', 97020000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx59', v_car, v_hpp);
end $$;

-- [BELI] Johan — Hyundai i20 2009 (2026-04-19)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Hyundai', 'i20', 2009, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-04-19'), v_car, date '2026-04-19', 61500000, 4325000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":4325000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000004', 'amount', 65825000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx53', v_car, v_hpp);
end $$;

-- [BELI] Defri — Toyota Camry Hybrid 2013 (2026-04-21)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Toyota', 'Camry Hybrid', 2013, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-04-21'), v_car, date '2026-04-21', 86500000, 18440000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":18440000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000006', 'amount', 104940000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx65', v_car, v_hpp);
end $$;

-- [BELI] Ari — Honda CRV 2012 (2026-04-23)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'CRV', 2012, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-04-23'), v_car, date '2026-04-23', 116700000, 2550000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":2550000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 119250000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx18', v_car, v_hpp);
end $$;

-- [BELI] Ari — Toyota Vios G 2007 (2026-04-23)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Toyota', 'Vios G', 2007, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-04-23'), v_car, date '2026-04-23', 64500000, 4500000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":4500000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 69000000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx16', v_car, v_hpp);
end $$;

-- [BELI] Ari — Toyota Avanza S 2009 (2026-04-23)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Toyota', 'Avanza S', 2009, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-04-23'), v_car, date '2026-04-23', 71776000, 2500000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":2500000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 74276000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx15', v_car, v_hpp);
end $$;

-- [JUAL] Surya — Honda CRV 2009 (2026-04-24)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx59';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-04-24'), v_car, date '2026-04-24', 104000000, 0, 0, v_hpp, 104000000-v_hpp, 104000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-04-24');
end $$;

-- [BELI] Azka — Honda Accord 2004 (2026-04-25)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'Accord', 2004, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-04-25'), v_car, date '2026-04-25', 48000000, 9765000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":9765000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000002', 'amount', 57765000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx36', v_car, v_hpp);
end $$;

-- [BELI] Surya — Suzuki SX4 2007 (2026-04-26)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Suzuki', 'SX4', 2007, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-04-26'), v_car, date '2026-04-26', 65000000, 3675000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":3675000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000005', 'amount', 68675000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx60', v_car, v_hpp);
end $$;

-- [JUAL] Ari — Toyota Avanza S 2009 (2026-04-30)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx15';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-04-30'), v_car, date '2026-04-30', 83000000, 0, 0, v_hpp, 83000000-v_hpp, 83000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-04-30');
end $$;

-- [JUAL] Surya — Suzuki SX4 2007 (2026-05-04)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx60';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-05-04'), v_car, date '2026-05-04', 76000000, 0, 0, v_hpp, 76000000-v_hpp, 76000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-05-04');
end $$;

-- [BELI] Surya — VW Tiguan 2014 (2026-05-05)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('VW', 'Tiguan', 2014, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-05-05'), v_car, date '2026-05-05', 83500000, 5000000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":5000000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000005', 'amount', 88500000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx61', v_car, v_hpp);
end $$;

-- [JUAL] Ari — Toyota Vios G 2007 (2026-05-06)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx16';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-05-06'), v_car, date '2026-05-06', 79000000, 0, 0, v_hpp, 79000000-v_hpp, 79000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-05-06');
end $$;

-- [BELI] Ari — Toyota Vios G 2008 (2026-05-07)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Toyota', 'Vios G', 2008, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-05-07'), v_car, date '2026-05-07', 56000000, 9685000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":9685000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 65685000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx17', v_car, v_hpp);
end $$;

-- [BELI] Rosyid — Suzuki APV 2011 (2026-05-10)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Suzuki', 'APV', 2011, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-05-10'), v_car, date '2026-05-10', 62000000, 300000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":300000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000003', 'amount', 62300000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx44', v_car, v_hpp);
end $$;

-- [JUAL] Rosyid — Nissan Serena 2010 (2026-05-10)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx43';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-05-10'), v_car, date '2026-05-10', 75000000, 0, 0, v_hpp, 75000000-v_hpp, 75000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-05-10');
end $$;

-- [JUAL] Rosyid — Suzuki APV 2011 (2026-05-10)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx44';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-05-10'), v_car, date '2026-05-10', 70000000, 0, 0, v_hpp, 70000000-v_hpp, 70000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-05-10');
end $$;

-- [JUAL] Surya — VW Tiguan 2014 (2026-05-14)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx61';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-05-14'), v_car, date '2026-05-14', 99000000, 0, 0, v_hpp, 99000000-v_hpp, 99000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-05-14');
end $$;

-- [BELI] Surya — Suzuki SX4 2010 (2026-05-15)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Suzuki', 'SX4', 2010, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-05-15'), v_car, date '2026-05-15', 75500000, 5530000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":5530000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000005', 'amount', 81030000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx62', v_car, v_hpp);
end $$;

-- [JUAL] Ari — Toyota Vios G 2008 (2026-05-17)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx17';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-05-17'), v_car, date '2026-05-17', 73500000, 0, 0, v_hpp, 73500000-v_hpp, 73500000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-05-17');
end $$;

-- [BELI] Rosyid — Mitsubishi Grandis 2010 (2026-05-19)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Mitsubishi', 'Grandis', 2010, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-05-19'), v_car, date '2026-05-19', 78000000, 900000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":900000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000003', 'amount', 78900000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx45', v_car, v_hpp);
end $$;

-- [JUAL] Surya — Suzuki SX4 2010 (2026-05-21)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx62';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-05-21'), v_car, date '2026-05-21', 89000000, 0, 0, v_hpp, 89000000-v_hpp, 89000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-05-21');
end $$;

-- [JUAL] Ari — Honda CRV 2012 (2026-05-22)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx18';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-05-22'), v_car, date '2026-05-22', 123500000, 0, 0, v_hpp, 123500000-v_hpp, 123500000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-05-22');
end $$;

-- [JUAL] Johan — Hyundai i20 2009 (2026-05-22)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx53';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-05-22'), v_car, date '2026-05-22', 74000000, 0, 0, v_hpp, 74000000-v_hpp, 74000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-05-22');
end $$;

-- [BELI] Ari — VW Polo 2013 (2026-05-23)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('VW', 'Polo', 2013, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-05-23'), v_car, date '2026-05-23', 73500000, 1800000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":1800000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 75300000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx19', v_car, v_hpp);
end $$;

-- [JUAL] Azka — Honda CRV 2.0 2010 (2026-05-23)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx35';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-05-23'), v_car, date '2026-05-23', 98000000, 0, 0, v_hpp, 98000000-v_hpp, 98000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-05-23');
end $$;

-- [BELI] Ari — Ford Fiesta 2011 (2026-05-25)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Ford', 'Fiesta', 2011, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-05-25'), v_car, date '2026-05-25', 47000000, 7460000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":7460000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 54460000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx20', v_car, v_hpp);
end $$;

-- [JUAL] Rosyid — Mitsubishi Grandis 2010 (2026-05-26)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx45';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-05-26'), v_car, date '2026-05-26', 92000000, 0, 0, v_hpp, 92000000-v_hpp, 92000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-05-26');
end $$;

-- [BELI] Rosyid — Nissan Grand Livina 2011 (2026-05-29)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Nissan', 'Grand Livina', 2011, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-05-29'), v_car, date '2026-05-29', 67500000, 7000000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":7000000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000003', 'amount', 74500000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx46', v_car, v_hpp);
end $$;

-- [JUAL] Defri — Toyota Camry Hybrid 2013 (2026-05-29)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx65';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-05-29'), v_car, date '2026-05-29', 115000000, 0, 0, v_hpp, 115000000-v_hpp, 115000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-05-29');
end $$;

-- [BELI] Verdi — Mitsubishi Mirage 2014 (2026-05-30)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Mitsubishi', 'Mirage', 2014, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-05-30'), v_car, date '2026-05-30', 70500000, 10660000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":10660000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000007', 'amount', 81160000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx70', v_car, v_hpp);
end $$;

-- [BELI] Surya — Chevrolet Orlando 2015 (2026-05-31)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Chevrolet', 'Orlando', 2015, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-05-31'), v_car, date '2026-05-31', 69800000, 8412000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":8412000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000005', 'amount', 78212000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx63', v_car, v_hpp);
end $$;

-- [BELI] Johan — Honda City 2011 (2026-05-31)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'City', 2011, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-05-31'), v_car, date '2026-05-31', 82000000, 6520000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":6520000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000004', 'amount', 88520000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx54', v_car, v_hpp);
end $$;

-- [JUAL] Ari — VW Polo 2013 (2026-06-01)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx19';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-06-01'), v_car, date '2026-06-01', 89000000, 0, 0, v_hpp, 89000000-v_hpp, 89000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-06-01');
end $$;

-- [BELI] Wawan — Honda Mobilio 2014 (2026-06-02)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'Mobilio', 2014, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-06-02'), v_car, date '2026-06-02', 97500000, 7470000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":7470000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000008', 'amount', 104970000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx74', v_car, v_hpp);
end $$;

-- [BELI] Defri — Honda City 2008 (2026-06-02)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'City', 2008, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-06-02'), v_car, date '2026-06-02', 62500000, 6975000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":6975000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000006', 'amount', 69475000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx66', v_car, v_hpp);
end $$;

-- [BELI] Ari — Mitsubishi Mirage 2013 (2026-06-02)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Mitsubishi', 'Mirage', 2013, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-06-02'), v_car, date '2026-06-02', 78300000, 4910000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":4910000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 83210000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx22', v_car, v_hpp);
end $$;

-- [BELI] Ari — Nissan Teana 2011 (2026-06-08)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Nissan', 'Teana', 2011, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-06-08'), v_car, date '2026-06-08', 82300000, 6825000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":6825000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 89125000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx21', v_car, v_hpp);
end $$;

-- [JUAL] Ari — Ford Fiesta 2011 (2026-06-08)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx20';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-06-08'), v_car, date '2026-06-08', 59500000, 0, 0, v_hpp, 59500000-v_hpp, 59500000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-06-08');
end $$;

-- [JUAL] Johan — Honda City 2011 (2026-06-12)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx54';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-06-12'), v_car, date '2026-06-12', 94000000, 0, 0, v_hpp, 94000000-v_hpp, 94000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-06-12');
end $$;

-- [JUAL] Azka — Honda Accord 2004 (2026-06-15)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx36';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-06-15'), v_car, date '2026-06-15', 69000000, 0, 0, v_hpp, 69000000-v_hpp, 69000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-06-15');
end $$;

-- [JUAL] Ari — Nissan Teana 2011 (2026-06-18)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx21';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-06-18'), v_car, date '2026-06-18', 97000000, 0, 0, v_hpp, 97000000-v_hpp, 97000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-06-18');
end $$;

-- [BELI] Johan — Mercedes Benz E280 2008 (2026-06-19)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Mercedes Benz', 'E280', 2008, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-06-19'), v_car, date '2026-06-19', 70800000, 4000000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":4000000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000004', 'amount', 74800000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx55', v_car, v_hpp);
end $$;

-- [BELI] Azka — Toyota Kijang LGX 2004 (2026-06-19)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Toyota', 'Kijang LGX', 2004, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-06-19'), v_car, date '2026-06-19', 62300000, 6190000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":6190000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000002', 'amount', 68490000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx37', v_car, v_hpp);
end $$;

-- [JUAL] Defri — Honda City 2008 (2026-06-19)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx66';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-06-19'), v_car, date '2026-06-19', 77000000, 0, 0, v_hpp, 77000000-v_hpp, 77000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-06-19');
end $$;

-- [JUAL] Ari — Mitsubishi Mirage 2013 (2026-06-20)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx22';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-06-20'), v_car, date '2026-06-20', 87000000, 0, 0, v_hpp, 87000000-v_hpp, 87000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-06-20');
end $$;

-- [JUAL] Verdi — Mitsubishi Mirage 2014 (2026-06-21)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx70';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-06-21'), v_car, date '2026-06-21', 87000000, 0, 0, v_hpp, 87000000-v_hpp, 87000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-06-21');
end $$;

-- [BELI] Verdi — Honda Accord 2007 (2026-06-23)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'Accord', 2007, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-06-23'), v_car, date '2026-06-23', 60000000, 8890000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":8890000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000007', 'amount', 68890000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx71', v_car, v_hpp);
end $$;

-- [BELI] Ari — Honda City 2008 (2026-06-24)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'City', 2008, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-06-24'), v_car, date '2026-06-24', 61300000, 6935000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":6935000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 68235000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx23', v_car, v_hpp);
end $$;

-- [JUAL] Rosyid — Nissan Grand Livina 2011 (2026-06-24)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx46';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-06-24'), v_car, date '2026-06-24', 79500000, 0, 0, v_hpp, 79500000-v_hpp, 79500000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-06-24');
end $$;

-- [BELI] Verdi — Suzuki SX4 2009 (2026-06-27)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Suzuki', 'SX4', 2009, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-06-27'), v_car, date '2026-06-27', 70000000, 5400000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":5400000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000007', 'amount', 75400000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx72', v_car, v_hpp);
end $$;

-- [JUAL] Verdi — Honda Accord 2007 (2026-06-27)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx71';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-06-27'), v_car, date '2026-06-27', 79500000, 0, 0, v_hpp, 79500000-v_hpp, 79500000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-06-27');
end $$;

-- [BELI] Defri — Toyota Vios G 2008 (2026-06-28)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Toyota', 'Vios G', 2008, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-06-28'), v_car, date '2026-06-28', 65000000, 8730000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":8730000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000006', 'amount', 73730000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx67', v_car, v_hpp);
end $$;

-- [BELI] Ari — Mercedes Benz C240 2005 (2026-06-30)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Mercedes Benz', 'C240', 2005, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-06-30'), v_car, date '2026-06-30', 62100000, 4600000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":4600000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 66700000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx24', v_car, v_hpp);
end $$;

-- [BELI] Habib — Nissan Teana 2013 (2026-07-06)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Nissan', 'Teana', 2013, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-06'), v_car, date '2026-07-06', 101000000, 6875000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":6875000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000009', 'amount', 107875000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx80', v_car, v_hpp);
end $$;

-- [BELI] Habib — Suzuki Baleno 2008 (2026-07-09)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Suzuki', 'Baleno', 2008, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-09'), v_car, date '2026-07-09', 60000000, 5650000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":5650000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000009', 'amount', 65650000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx75', v_car, v_hpp);
end $$;

-- [BELI] Surya — Nissan Xtrail 2011 (2026-07-10)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Nissan', 'Xtrail', 2011, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-10'), v_car, date '2026-07-10', 76000000, 3440000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":3440000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000005', 'amount', 79440000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx64', v_car, v_hpp);
end $$;

-- [JUAL] Ari — Honda City 2008 (2026-07-10)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx23';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-07-10'), v_car, date '2026-07-10', 76500000, 0, 0, v_hpp, 76500000-v_hpp, 76500000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-07-10');
end $$;

-- [JUAL] Surya — Chevrolet Orlando 2015 (2026-07-10)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx63';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-07-10'), v_car, date '2026-07-10', 94000000, 0, 0, v_hpp, 94000000-v_hpp, 94000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-07-10');
end $$;

-- [BELI] Habib — Honda Accord 2012 (2026-07-12)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'Accord', 2012, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-12'), v_car, date '2026-07-12', 106000000, 7310000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":7310000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000009', 'amount', 113310000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx77', v_car, v_hpp);
end $$;

-- [BELI] Johan — Mercedes Benz C180 1995 (2026-07-12)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Mercedes Benz', 'C180', 1995, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-12'), v_car, date '2026-07-12', 28000000, 1800000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":1800000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000004', 'amount', 29800000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx56', v_car, v_hpp);
end $$;

-- [JUAL] Johan — Mercedes Benz E280 2008 (2026-07-12)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx55';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-07-12'), v_car, date '2026-07-12', 85000000, 0, 0, v_hpp, 85000000-v_hpp, 85000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-07-12');
end $$;

-- [JUAL] Johan — Mercedes Benz C180 1995 (2026-07-13)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx56';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-07-13'), v_car, date '2026-07-13', 43000000, 0, 0, v_hpp, 43000000-v_hpp, 43000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-07-13');
end $$;

-- [JUAL] Verdi — Suzuki SX4 2009 (2026-07-13)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx72';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-07-13'), v_car, date '2026-07-13', 87000000, 0, 0, v_hpp, 87000000-v_hpp, 87000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-07-13');
end $$;

-- [BELI] Verdi — Nissan Grand Livina 2015 (2026-07-14)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Nissan', 'Grand Livina', 2015, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-14'), v_car, date '2026-07-14', 65500000, 25190000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":25190000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000007', 'amount', 90690000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx73', v_car, v_hpp);
end $$;

-- [BELI] Ari — Chevrolet Captiva 2010 (2026-07-14)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Chevrolet', 'Captiva', 2010, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-14'), v_car, date '2026-07-14', 80000000, 8465000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":8465000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 88465000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx28', v_car, v_hpp);
end $$;

-- [JUAL] Ari — Mercedes Benz C240 2005 (2026-07-15)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx24';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-07-15'), v_car, date '2026-07-15', 73000000, 0, 0, v_hpp, 73000000-v_hpp, 73000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-07-15');
end $$;

-- [BELI] Ari — Suzuki SX4 2008 (2026-07-19)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Suzuki', 'SX4', 2008, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-19'), v_car, date '2026-07-19', 62000000, 5230000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":5230000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 67230000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx27', v_car, v_hpp);
end $$;

-- [BELI] Habib — Nissan Grand Livina 2014 (2026-07-20)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Nissan', 'Grand Livina', 2014, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-20'), v_car, date '2026-07-20', 78000000, 4765000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":4765000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000009', 'amount', 82765000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx76', v_car, v_hpp);
end $$;

-- [BELI] Ari — Toyota Camry V 2009 (2026-07-21)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Toyota', 'Camry V', 2009, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-21'), v_car, date '2026-07-21', 90000000, 2200000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":2200000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 92200000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx25', v_car, v_hpp);
end $$;

-- [JUAL] Defri — Toyota Vios G 2008 (2026-07-21)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx67';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-07-21'), v_car, date '2026-07-21', 78000000, 0, 0, v_hpp, 78000000-v_hpp, 78000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-07-21');
end $$;

-- [BELI] Defri — Honda City 2008 (2026-07-22)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'City', 2008, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-22'), v_car, date '2026-07-22', 62000000, 6000000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":6000000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000006', 'amount', 68000000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx68', v_car, v_hpp);
end $$;

-- [JUAL] Habib — Suzuki Baleno 2008 (2026-07-22)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx75';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-07-22'), v_car, date '2026-07-22', 72000000, 0, 0, v_hpp, 72000000-v_hpp, 72000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-07-22');
end $$;

-- [JUAL] Ari — Toyota Camry V 2009 (2026-07-23)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx25';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-07-23'), v_car, date '2026-07-23', 104000000, 0, 0, v_hpp, 104000000-v_hpp, 104000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-07-23');
end $$;

-- [BELI] Habib — Toyota Innova V 2009 (2026-07-24)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Toyota', 'Innova V', 2009, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-24'), v_car, date '2026-07-24', 105000000, 3800000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":3800000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000009', 'amount', 108800000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx79', v_car, v_hpp);
end $$;

-- [BELI] Ari — Nissan Grand Livina 2011 (2026-07-24)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Nissan', 'Grand Livina', 2011, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-24'), v_car, date '2026-07-24', 64000000, 7900000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":7900000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 71900000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx29', v_car, v_hpp);
end $$;

-- [BELI] Habib — Mazda 2 2011 (2026-07-26)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Mazda', '2', 2011, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-26'), v_car, date '2026-07-26', 76000000, 7035000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":7035000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000009', 'amount', 83035000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx78', v_car, v_hpp);
end $$;

-- [BELI] Johan — Mercedes Benz C200 2008 (2026-07-26)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Mercedes Benz', 'C200', 2008, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-26'), v_car, date '2026-07-26', 68000000, 13920000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":13920000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000004', 'amount', 81920000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx57', v_car, v_hpp);
end $$;

-- [BELI] Ari — Mitsubishi Grandis 2006 (2026-07-26)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Mitsubishi', 'Grandis', 2006, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-26'), v_car, date '2026-07-26', 60000000, 4160000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":4160000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 64160000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx26', v_car, v_hpp);
end $$;

-- [JUAL] Habib — Nissan Grand Livina 2014 (2026-07-29)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx76';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-07-29'), v_car, date '2026-07-29', 87000000, 0, 0, v_hpp, 87000000-v_hpp, 87000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-07-29');
end $$;

-- [JUAL] Defri — Honda City 2008 (2026-07-30)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx68';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-07-30'), v_car, date '2026-07-30', 78000000, 0, 0, v_hpp, 78000000-v_hpp, 78000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-07-30');
end $$;

-- [BELI] Defri — Hyundai i20 2009 (2026-07-31)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Hyundai', 'i20', 2009, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-31'), v_car, date '2026-07-31', 53000000, 2400000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":2400000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000006', 'amount', 55400000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx69', v_car, v_hpp);
end $$;

-- [BELI] Ari — Mazda CX7 2010 (2026-07-31)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Mazda', 'CX7', 2010, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-31'), v_car, date '2026-07-31', 74000000, 8050000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":8050000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 82050000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx30', v_car, v_hpp);
end $$;

-- [JUAL] Ari — Mitsubishi Grandis 2006 (2026-07-31)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx26';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-07-31'), v_car, date '2026-07-31', 76000000, 0, 0, v_hpp, 76000000-v_hpp, 76000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-07-31');
end $$;

-- [BELI] Habib — Toyota Camry V 2010 (2026-08-01)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Toyota', 'Camry V', 2010, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-08-01'), v_car, date '2026-08-01', 100000000, 7500000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":7500000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000009', 'amount', 107500000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx84', v_car, v_hpp);
end $$;

-- [JUAL] Habib — Honda Accord 2012 (2026-08-01)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx77';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-08-01'), v_car, date '2026-08-01', 121000000, 0, 0, v_hpp, 121000000-v_hpp, 121000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-08-01');
end $$;

-- [BELI] Habib — Honda City 2005 (2026-08-03)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'City', 2005, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-08-03'), v_car, date '2026-08-03', 59000000, 6260000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":6260000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000009', 'amount', 65260000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx83', v_car, v_hpp);
end $$;

-- [BELI] Habib — Mazda 2 Skyactive 2016 (2026-08-03)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Mazda', '2 Skyactive', 2016, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-08-03'), v_car, date '2026-08-03', 87500000, 10105000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":10105000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000009', 'amount', 97605000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx82', v_car, v_hpp);
end $$;

-- [JUAL] Ari — Suzuki SX4 2008 (2026-08-03)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx27';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-08-03'), v_car, date '2026-08-03', 73500000, 0, 0, v_hpp, 73500000-v_hpp, 73500000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-08-03');
end $$;

-- [JUAL] Habib — Mazda 2 2011 (2026-08-03)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx78';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-08-03'), v_car, date '2026-08-03', 87000000, 0, 0, v_hpp, 87000000-v_hpp, 87000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-08-03');
end $$;

-- [JUAL] Habib — Toyota Innova V 2009 (2026-08-05)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx79';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-08-05'), v_car, date '2026-08-05', 120000000, 0, 0, v_hpp, 120000000-v_hpp, 120000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-08-05');
end $$;

-- [BELI] Habib — Honda CRV 2009 (2026-08-06)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Honda', 'CRV', 2009, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-08-06'), v_car, date '2026-08-06', 85000000, 500000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":500000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000009', 'amount', 85500000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx81', v_car, v_hpp);
end $$;

-- [BELI] Ari — Suzuki SX4 2008 (2026-08-07)
do $$
declare v_car uuid; v_purchase uuid; v_hpp numeric;
begin
  insert into cars (merek, tipe, tahun, status, catatan) values ('Suzuki', 'SX4', 2008, 'DIBELI', 'Migrasi data historis') returning id into v_car;
  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-08-07'), v_car, date '2026-08-07', 59000000, 12300000, '[{"nama":"Biaya tambahan (data migrasi)","nominal":12300000}]'::jsonb)
  returning id into v_purchase;
  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', '99999999-0000-4000-8000-000000000001', 'amount', 71300000)));
  update cars set status = 'READY_STOCK' where id = v_car;
  select hpp into v_hpp from v_car_hpp where car_id = v_car;
  insert into _migrasi_map values ('trx31', v_car, v_hpp);
end $$;

-- [JUAL] Ari — Nissan Grand Livina 2011 (2026-08-07)
do $$
declare v_car uuid; v_hpp numeric; v_sale uuid;
begin
  select car_id, hpp into v_car, v_hpp from _migrasi_map where trx_id = 'trx29';
  insert into car_sales (no_transaksi, car_id, tanggal_jual, harga_jual, komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar, catatan)
  values (fn_next_doc_number('JUL', date '2026-08-07'), v_car, date '2026-08-07', 76000000, 0, 0, v_hpp, 76000000-v_hpp, 76000000-v_hpp, 'TRANSFER', 'Migrasi data historis')
  returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;
  perform process_profit_sharing(v_sale, date '2026-08-07');
end $$;

commit;

-- select * from v_investor_balance;
-- select * from v_dashboard_summary;