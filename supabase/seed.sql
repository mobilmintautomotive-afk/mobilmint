-- =====================================================================
-- MobilMint — Seed data untuk development
-- JANGAN dijalankan di produksi (lihat PRD Fase 5 bagian 5.1 no.6).
--
-- Seluruh angka keuangan di bawah dihitung oleh function database
-- (fn_preview_allocation / allocate_purchase_funding / process_profit_sharing)
-- supaya seed selalu konsisten dengan logika aplikasi.
-- =====================================================================

begin;

-- Bersihkan data lama (urutan mengikuti dependensi FK)
truncate table
  profit_sharing_details, profit_sharings, car_sales, repairs, car_fundings,
  purchases, investor_ledger, investor_contracts, cars, customers,
  sales_persons, vendors, suppliers, investment_tiers, profiles, investors,
  operational_expenses
restart identity cascade;

-- ---------------------------------------------------------------------
-- Golongan Investasi
-- ---------------------------------------------------------------------
insert into investment_tiers (id, nama_golongan, nilai_investasi, nisbah_investor_pct, nisbah_pengelola_pct, tenor_bulan, deskripsi) values
  ('11111111-0000-4000-8000-000000000001', 'Silver',   50000000,  60, 40, 12, 'Paket pemula, tenor 12 bulan'),
  ('11111111-0000-4000-8000-000000000002', 'Gold',     100000000, 65, 35, 12, 'Paket menengah, nisbah lebih besar'),
  ('11111111-0000-4000-8000-000000000003', 'Platinum', 250000000, 70, 30, 24, 'Paket premium, tenor 24 bulan');

-- ---------------------------------------------------------------------
-- Investor
-- ---------------------------------------------------------------------
insert into investors (id, nama, alamat, no_tlp, email, nama_bank, no_rekening, atas_nama_rekening) values
  ('22222222-0000-4000-8000-000000000001', 'Budi Santoso',  'Jl. Melati No. 12, Bandung',    '081234567801', 'budi@example.com',  'BCA',     '1234567801', 'Budi Santoso'),
  ('22222222-0000-4000-8000-000000000002', 'Siti Rahayu',   'Jl. Kenanga No. 45, Jakarta',   '081234567802', 'siti@example.com',  'Mandiri', '1234567802', 'Siti Rahayu'),
  ('22222222-0000-4000-8000-000000000003', 'Andi Wijaya',   'Jl. Anggrek No. 8, Surabaya',   '081234567803', 'andi@example.com',  'BNI',     '1234567803', 'Andi Wijaya'),
  ('22222222-0000-4000-8000-000000000004', 'Rina Kusuma',   'Jl. Cempaka No. 21, Semarang',  '081234567804', 'rina@example.com',  'BRI',     '1234567804', 'Rina Kusuma');

-- ---------------------------------------------------------------------
-- Akun pengguna (Fase 4 — belum tersambung ke Supabase Auth)
-- ---------------------------------------------------------------------
insert into profiles (nama, email, role, investor_id) values
  ('Owner MobilMint', 'owner@mobilmint.id',  'admin',    null),
  ('Manajer Holding', 'holding@mobilmint.id','holding',  null),
  ('Budi Santoso',    'budi@example.com',    'investor', '22222222-0000-4000-8000-000000000001'),
  ('Siti Rahayu',     'siti@example.com',    'investor', '22222222-0000-4000-8000-000000000002');

-- ---------------------------------------------------------------------
-- Supplier, Vendor, Sales, Customer
-- ---------------------------------------------------------------------
insert into suppliers (id, nama, alamat, no_tlp, tipe_supplier) values
  ('33333333-0000-4000-8000-000000000001', 'Balai Lelang JBA',  'Jl. Raya Bekasi KM 21',   '02188990011', 'LELANG'),
  ('33333333-0000-4000-8000-000000000002', 'Pak Hendra (Mediator)', 'Jl. Sudirman No. 3', '081377889900', 'MEDIATOR');

insert into vendors (id, nama, alamat, no_tlp, tipe_vendor) values
  ('44444444-0000-4000-8000-000000000001', 'Bengkel Jaya Motor', 'Jl. Industri No. 9',  '02177001122', 'BENGKEL'),
  ('44444444-0000-4000-8000-000000000002', 'Auto Salon Kilap',   'Jl. Mawar No. 17',    '02177003344', 'SALON');

insert into sales_persons (id, nama, alamat, no_tlp, komisi_default) values
  ('55555555-0000-4000-8000-000000000001', 'Dedi Kurniawan', 'Jl. Kebon Jeruk No. 5', '081399887766', 2000000),
  ('55555555-0000-4000-8000-000000000002', 'Maya Putri',     'Jl. Pahlawan No. 30',   '081399887755', 2500000);

insert into customers (id, nama, alamat, no_tlp) values
  ('66666666-0000-4000-8000-000000000001', 'Hendra Gunawan', 'Jl. Diponegoro No. 11, Bandung', '081255443322'),
  ('66666666-0000-4000-8000-000000000002', 'Lestari Dewi',   'Jl. Gatot Subroto No. 4, Jakarta','081255443311'),
  ('66666666-0000-4000-8000-000000000003', 'Agus Setiawan',  'Jl. Ahmad Yani No. 88, Bekasi',  '081255443300');

-- ---------------------------------------------------------------------
-- Akad Investor + setoran dana (ledger SETORAN)
-- ---------------------------------------------------------------------
do $$
declare
  r record;
  v_no text;
  v_cid uuid;
begin
  for r in
    select * from (values
      ('22222222-0000-4000-8000-000000000001'::uuid, '11111111-0000-4000-8000-000000000003'::uuid, date '2026-01-10'),
      ('22222222-0000-4000-8000-000000000002'::uuid, '11111111-0000-4000-8000-000000000002'::uuid, date '2026-01-15'),
      ('22222222-0000-4000-8000-000000000003'::uuid, '11111111-0000-4000-8000-000000000001'::uuid, date '2026-01-20'),
      ('22222222-0000-4000-8000-000000000004'::uuid, '11111111-0000-4000-8000-000000000003'::uuid, date '2026-02-02')
    ) as t(investor_id, tier_id, tanggal)
  loop
    v_no := fn_next_doc_number('AKD', r.tanggal);

    insert into investor_contracts (
      no_akad, investor_id, tier_id, nilai_investasi,
      nisbah_investor_pct, nisbah_pengelola_pct, tenor_bulan,
      tanggal_akad, tanggal_dana_diterima, jumlah_diterima, status
    )
    select
      v_no, r.investor_id, t.id, t.nilai_investasi,
      t.nisbah_investor_pct, t.nisbah_pengelola_pct, t.tenor_bulan,
      r.tanggal, r.tanggal + 2, t.nilai_investasi, 'AKTIF'
    from investment_tiers t where t.id = r.tier_id
    returning id into v_cid;

    insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
    select r.investor_id, v_cid, 'SETORAN', c.nilai_investasi,
           'Setoran investasi golongan ' || t.nama_golongan,
           'investor_contracts', v_cid, c.tanggal_dana_diterima
    from investor_contracts c join investment_tiers t on t.id = c.tier_id
    where c.id = v_cid;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Unit mobil + pembelian + alokasi modal + perbaikan + penjualan
-- ---------------------------------------------------------------------
do $$
declare
  v_car uuid;
  v_purchase uuid;
  v_sale uuid;
  v_alloc jsonb;
  v_hpp numeric;
  v_repair uuid;
begin
  -- =========================================================
  -- UNIT 1 — Toyota Avanza 2019 : siklus penuh sampai SELESAI
  -- =========================================================
  insert into cars (merek, tipe, tahun, warna, no_polisi, no_rangka, no_mesin, transmisi, kilometer, tanggal_pajak, status, catatan)
  values ('Toyota','Avanza G',2019,'Silver','B 1234 XYZ','MHKM1BA3JKJ001234','1NRF012345','MANUAL',68000, date '2027-03-14','DIBELI','Unit pertama, kondisi mesin sehat')
  returning id into v_car;

  insert into purchases (no_transaksi, car_id, supplier_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain, catatan)
  values (fn_next_doc_number('BLI', date '2026-02-14'), v_car, '33333333-0000-4000-8000-000000000001', date '2026-02-14',
          115000000, 5000000,
          '[{"nama":"Biaya lelang","nominal":3000000},{"nama":"Mutasi & balik nama","nominal":2000000}]'::jsonb,
          'Beli dari lelang JBA batch Februari')
  returning id into v_purchase;

  select jsonb_agg(jsonb_build_object('investor_id', a.investor_id, 'amount', a.amount))
    into v_alloc from fn_preview_allocation(120000000) a;
  perform allocate_purchase_funding(v_purchase, v_alloc);

  insert into repairs (car_id, vendor_id, jenis_perbaikan, deskripsi, biaya, tanggal_masuk, tanggal_selesai, status)
  values (v_car, '44444444-0000-4000-8000-000000000001','Mesin','Ganti timing belt, tune up, ganti oli', 5000000, date '2026-02-16', date '2026-02-24','SELESAI'),
         (v_car, '44444444-0000-4000-8000-000000000002','Salon','Poles body & cuci interior', 2000000, date '2026-02-25', date '2026-02-27','SELESAI');

  update cars set status = 'READY_STOCK' where id = v_car;

  select hpp into v_hpp from v_car_hpp where car_id = v_car;   -- 127.000.000
  insert into car_sales (
    no_transaksi, car_id, customer_id, sales_person_id, tanggal_jual, harga_jual,
    komisi_sales, biaya_lain, rincian_biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar
  ) values (
    fn_next_doc_number('JUL', date '2026-04-08'), v_car,
    '66666666-0000-4000-8000-000000000001','55555555-0000-4000-8000-000000000001',
    date '2026-04-08', 155000000, 2000000, 1000000,
    '[{"nama":"Biaya administrasi","nominal":1000000}]'::jsonb,
    v_hpp, 155000000 - v_hpp, 155000000 - v_hpp - 2000000 - 1000000, 'TRANSFER'
  ) returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;

  perform process_profit_sharing(v_sale, date '2026-04-10');

  -- =========================================================
  -- UNIT 2 — Mitsubishi Xpander 2022 : TERJUAL, belum bagi hasil
  -- =========================================================
  insert into cars (merek, tipe, tahun, warna, no_polisi, no_rangka, no_mesin, transmisi, kilometer, tanggal_pajak, status, catatan)
  values ('Mitsubishi','Xpander Ultimate',2022,'Putih','B 8899 KLM','MMBJ1KA5NHK008899','4A91008899','MATIC',31000, date '2027-05-20','DIBELI', null)
  returning id into v_car;

  insert into purchases (no_transaksi, car_id, supplier_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-03-05'), v_car, '33333333-0000-4000-8000-000000000002', date '2026-03-05',
          200000000, 5000000, '[{"nama":"Komisi mediator","nominal":5000000}]'::jsonb)
  returning id into v_purchase;

  select jsonb_agg(jsonb_build_object('investor_id', a.investor_id, 'amount', a.amount))
    into v_alloc from fn_preview_allocation(205000000) a;
  perform allocate_purchase_funding(v_purchase, v_alloc);

  insert into repairs (car_id, vendor_id, jenis_perbaikan, deskripsi, biaya, tanggal_masuk, tanggal_selesai, status)
  values (v_car, '44444444-0000-4000-8000-000000000002','Salon','Detailing full & coating', 3000000, date '2026-03-08', date '2026-03-11','SELESAI');
  update cars set status = 'READY_STOCK' where id = v_car;

  select hpp into v_hpp from v_car_hpp where car_id = v_car;   -- 208.000.000
  insert into car_sales (
    no_transaksi, car_id, customer_id, sales_person_id, tanggal_jual, harga_jual,
    komisi_sales, biaya_lain, hpp_snapshot, laba_kotor, laba_bersih, metode_bayar
  ) values (
    fn_next_doc_number('JUL', date '2026-07-05'), v_car,
    '66666666-0000-4000-8000-000000000002','55555555-0000-4000-8000-000000000002',
    date '2026-07-05', 230000000, 2500000, 1500000,
    v_hpp, 230000000 - v_hpp, 230000000 - v_hpp - 2500000 - 1500000, 'KREDIT'
  );
  update cars set status = 'TERJUAL' where id = v_car;

  -- =========================================================
  -- UNIT 3 — Honda Brio 2020 : READY_STOCK (umur stok > 60 hari)
  -- =========================================================
  insert into cars (merek, tipe, tahun, warna, no_polisi, no_rangka, no_mesin, transmisi, kilometer, tanggal_pajak, status)
  values ('Honda','Brio RS',2020,'Merah','B 4321 QRS','MHRDD1830LJ004321','L12B004321','MATIC',45000, date '2027-01-09','DIBELI')
  returning id into v_car;

  insert into purchases (no_transaksi, car_id, supplier_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-03-10'), v_car, '33333333-0000-4000-8000-000000000001', date '2026-03-10',
          95000000, 2000000, '[{"nama":"Biaya lelang","nominal":2000000}]'::jsonb)
  returning id into v_purchase;

  select jsonb_agg(jsonb_build_object('investor_id', a.investor_id, 'amount', a.amount))
    into v_alloc from fn_preview_allocation(97000000) a;
  perform allocate_purchase_funding(v_purchase, v_alloc);

  insert into repairs (car_id, vendor_id, jenis_perbaikan, deskripsi, biaya, tanggal_masuk, tanggal_selesai, status)
  values (v_car, '44444444-0000-4000-8000-000000000001','Kaki-kaki','Ganti shockbreaker depan & spooring', 4000000, date '2026-03-12', date '2026-03-18','SELESAI');
  update cars set status = 'READY_STOCK' where id = v_car;

  -- =========================================================
  -- UNIT 4 — Daihatsu Xenia 2018 : PERBAIKAN (masih di bengkel)
  -- =========================================================
  insert into cars (merek, tipe, tahun, warna, no_polisi, no_rangka, no_mesin, transmisi, kilometer, tanggal_pajak, status)
  values ('Daihatsu','Xenia R',2018,'Hitam','B 5566 TUV','MHKV5EA2JJK005566','3SZ005566','MANUAL',92000, date '2026-11-30','DIBELI')
  returning id into v_car;

  insert into purchases (no_transaksi, car_id, supplier_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-06-02'), v_car, '33333333-0000-4000-8000-000000000002', date '2026-06-02',
          78000000, 1000000, '[{"nama":"Biaya derek","nominal":1000000}]'::jsonb)
  returning id into v_purchase;

  select jsonb_agg(jsonb_build_object('investor_id', a.investor_id, 'amount', a.amount))
    into v_alloc from fn_preview_allocation(79000000) a;
  perform allocate_purchase_funding(v_purchase, v_alloc);

  insert into repairs (car_id, vendor_id, jenis_perbaikan, deskripsi, biaya, tanggal_masuk, status)
  values (v_car, '44444444-0000-4000-8000-000000000001','Body','Perbaikan bumper depan & cat ulang', 6000000, date '2026-07-10','PROSES')
  returning id into v_repair;
  update cars set status = 'PERBAIKAN' where id = v_car;

  -- =========================================================
  -- UNIT 5 — Suzuki Ertiga 2021 : baru DIBELI
  -- =========================================================
  insert into cars (merek, tipe, tahun, warna, no_polisi, no_rangka, no_mesin, transmisi, kilometer, tanggal_pajak, status)
  values ('Suzuki','Ertiga GX',2021,'Abu-abu','B 7788 WXY','MHYKZE81SMJ007788','K15B007788','MATIC',52000, date '2027-02-18','DIBELI')
  returning id into v_car;

  insert into purchases (no_transaksi, car_id, supplier_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-18'), v_car, '33333333-0000-4000-8000-000000000001', date '2026-07-18',
          130000000, 3000000, '[{"nama":"Biaya lelang","nominal":2000000},{"nama":"Mutasi","nominal":1000000}]'::jsonb)
  returning id into v_purchase;

  select jsonb_agg(jsonb_build_object('investor_id', a.investor_id, 'amount', a.amount))
    into v_alloc from fn_preview_allocation(133000000) a;
  perform allocate_purchase_funding(v_purchase, v_alloc);
end $$;

-- ---------------------------------------------------------------------
-- Biaya operasional (dipakai di waterfall laba rugi)
-- ---------------------------------------------------------------------
insert into operational_expenses (tanggal, kategori, keterangan, nominal) values
  (date '2026-02-28','Gaji','Gaji staf kantor Februari', 8000000),
  (date '2026-03-31','Gaji','Gaji staf kantor Maret', 8000000),
  (date '2026-04-30','Gaji','Gaji staf kantor April', 8000000),
  (date '2026-04-05','Marketing','Iklan OLX & Facebook Ads', 2500000),
  (date '2026-05-31','Sewa','Sewa showroom Mei', 6000000),
  (date '2026-06-30','Sewa','Sewa showroom Juni', 6000000),
  (date '2026-07-05','Listrik','Listrik & internet Juli', 1500000);

commit;

-- Verifikasi cepat: total saldo investor harus sama dengan SUM ledger
-- select * from v_investor_balance;
-- select * from v_dashboard_summary;
