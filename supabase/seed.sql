-- =====================================================================
-- MobilMint — Seed data untuk development
-- JANGAN dijalankan di produksi (lihat PRD Fase 5 bagian 5.1 no.6).
--
-- Seluruh angka keuangan di bawah dihitung oleh function database
-- (allocate_purchase_funding / process_profit_sharing) supaya seed
-- selalu konsisten dengan logika aplikasi.
--
-- Model bisnis yang dipakai (per keputusan 2026-07-25):
-- - Golongan investasi berbasis rentang nilai setoran: 0-200jt (30%),
--   200-500jt (40%), >500jt (50%).
-- - Default pembelian: 1 unit dibiayai 1 investor. Urun dana (multi-
--   investor) hanya untuk investor dengan nisbah SAMA PERSIS — dicontohkan
--   di Unit 2 (Xpander, dibiayai Budi + Rina, sama-sama golongan >500jt).
-- - Biaya perbaikan & komisi sales SELALU menambah HPP/mengurangi laba
--   sebelum bagi hasil — otomatis tertanggung proporsional oleh investor
--   & pengelola lewat nisbah, BUKAN ditanggung pengelola sendirian. Yang
--   ditanggung pengelola murni cuma operasional dealer (gaji, sewa,
--   listrik) — lihat operational_expenses di bagian bawah.
-- =====================================================================

begin;

-- Bersihkan data lama (urutan mengikuti dependensi FK)
truncate table
  profit_sharing_details, profit_sharings, car_sales, repairs, car_fundings,
  purchases, investor_ledger, investor_contracts, cars, customers,
  sales_persons, vendors, suppliers, investment_tiers, profiles, investors,
  operational_expenses, company_assets
restart identity cascade;

-- ---------------------------------------------------------------------
-- Golongan Investasi — berbasis rentang nilai setoran
-- ---------------------------------------------------------------------
insert into investment_tiers (id, nama_golongan, nilai_investasi, nisbah_investor_pct, nisbah_pengelola_pct, tenor_bulan, deskripsi) values
  ('11111111-0000-4000-8000-000000000001', '0 - 200 Juta',   200000000,  30, 70, 12, 'Setoran sampai dengan Rp 200 juta'),
  ('11111111-0000-4000-8000-000000000002', '200 - 500 Juta', 500000000,  40, 60, 12, 'Setoran Rp 200 - 500 juta'),
  ('11111111-0000-4000-8000-000000000003', '> 500 Juta',     1000000000, 50, 50, 24, 'Setoran di atas Rp 500 juta');

-- ---------------------------------------------------------------------
-- Investor
-- Andi -> golongan 0-200jt | Siti -> 200-500jt | Budi & Rina -> >500jt
-- (Budi & Rina sengaja satu golongan supaya bisa urun dana bersama)
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
      ('22222222-0000-4000-8000-000000000003'::uuid, '11111111-0000-4000-8000-000000000001'::uuid, date '2026-01-10'), -- Andi, 0-200jt
      ('22222222-0000-4000-8000-000000000002'::uuid, '11111111-0000-4000-8000-000000000002'::uuid, date '2026-01-15'), -- Siti, 200-500jt
      ('22222222-0000-4000-8000-000000000001'::uuid, '11111111-0000-4000-8000-000000000003'::uuid, date '2026-01-20'), -- Budi, >500jt
      ('22222222-0000-4000-8000-000000000004'::uuid, '11111111-0000-4000-8000-000000000003'::uuid, date '2026-02-02')  -- Rina, >500jt
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
--
-- Default: 1 unit = 1 investor (alokasi ditulis manual, bukan proporsional
-- ke semua investor) — mencerminkan mekanisme "Urun Dana" yang sekarang
-- default-nya pilih 1 investor utama. Unit 2 sengaja dicontohkan urun
-- dana oleh 2 investor bernisbah sama (Budi & Rina, golongan >500jt).
-- ---------------------------------------------------------------------
do $$
declare
  v_andi  uuid := '22222222-0000-4000-8000-000000000003';
  v_siti  uuid := '22222222-0000-4000-8000-000000000002';
  v_budi  uuid := '22222222-0000-4000-8000-000000000001';
  v_rina  uuid := '22222222-0000-4000-8000-000000000004';

  v_car uuid;
  v_purchase uuid;
  v_sale uuid;
  v_hpp numeric;
  v_repair uuid;
begin
  -- =========================================================
  -- UNIT 1 — Toyota Avanza 2019 : siklus penuh sampai SELESAI
  -- Dibiayai Andi sendirian (golongan 0-200jt, nisbah 30%)
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

  perform allocate_purchase_funding(v_purchase,
    jsonb_build_array(jsonb_build_object('investor_id', v_andi, 'amount', 120000000)));

  -- Biaya perbaikan menambah HPP, otomatis mengurangi laba yang dibagi
  -- nanti (bukan ditanggung pengelola sendiri) — ambil_dari_modal=false
  -- artinya tidak memotong saldo Andi sekarang juga, cukup nempel di HPP.
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

  -- Bagi hasil sekarang OTOMATIS diproses begitu penjualan disimpan
  -- (app/actions/sales.ts) — di seed ini disimulasikan dengan memanggil
  -- process_profit_sharing tepat setelah insert car_sales.
  perform process_profit_sharing(v_sale, date '2026-04-10');
  -- Andi: saldo 200jt -120jt +120jt(modal kembali) +7,5jt(bagi hasil 30%) = 207.500.000

  -- Contoh dana SUDAH DICAIRKAN ke investor (demo tab "Riwayat Pencairan")
  perform proses_pencairan_dana(
    (select id from profit_sharing_details where profit_sharing_id =
      (select id from profit_sharings where car_sale_id = v_sale) and investor_id = v_andi),
    date '2026-04-12'
  );
  -- Andi: saldo 207.500.000 - 7.500.000(dicairkan) = 200.000.000 (kembali ke modal awal)

  -- =========================================================
  -- UNIT 2 — Mitsubishi Xpander 2022 : SELESAI, bagi hasil OTOMATIS
  -- tapi dana BELUM dicairkan (demo tab "Menunggu Dicairkan")
  -- URUN DANA: Budi + Rina (sama-sama golongan >500jt, nisbah 50%)
  -- =========================================================
  insert into cars (merek, tipe, tahun, warna, no_polisi, no_rangka, no_mesin, transmisi, kilometer, tanggal_pajak, status, catatan)
  values ('Mitsubishi','Xpander Ultimate',2022,'Putih','B 8899 KLM','MMBJ1KA5NHK008899','4A91008899','MATIC',31000, date '2027-05-20','DIBELI', 'Contoh urun dana: Budi + Rina, nisbah sama 50%')
  returning id into v_car;

  insert into purchases (no_transaksi, car_id, supplier_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-03-05'), v_car, '33333333-0000-4000-8000-000000000002', date '2026-03-05',
          200000000, 5000000, '[{"nama":"Komisi mediator","nominal":5000000}]'::jsonb)
  returning id into v_purchase;

  perform allocate_purchase_funding(v_purchase, jsonb_build_array(
    jsonb_build_object('investor_id', v_budi, 'amount', 102500000),
    jsonb_build_object('investor_id', v_rina, 'amount', 102500000)
  ));
  -- Budi: 1.000.000.000 - 102.500.000 = 897.500.000
  -- Rina: 1.000.000.000 - 102.500.000 = 897.500.000

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
  ) returning id into v_sale;
  update cars set status = 'TERJUAL' where id = v_car;

  perform process_profit_sharing(v_sale, date '2026-07-05');
  -- Budi & Rina masing-masing dapat modal_kembali 102.500.000 + bagi hasil
  -- 50% dari laba_bersih 18jt = 9jt -> total_kembali 111.500.000 masing-masing.
  -- Dana bagi hasilnya sengaja BELUM dicairkan (contoh "Menunggu Dicairkan").

  -- =========================================================
  -- UNIT 3 — Honda Brio 2020 : READY_STOCK
  -- Dibiayai Siti sendirian (golongan 200-500jt, nisbah 40%)
  -- Contoh "Ambil dari Modal Investor" saat perbaikan (checkbox PRD B3)
  -- =========================================================
  insert into cars (merek, tipe, tahun, warna, no_polisi, no_rangka, no_mesin, transmisi, kilometer, tanggal_pajak, status)
  values ('Honda','Brio RS',2020,'Merah','B 4321 QRS','MHRDD1830LJ004321','L12B004321','MATIC',45000, date '2027-01-09','DIBELI')
  returning id into v_car;

  insert into purchases (no_transaksi, car_id, supplier_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-03-10'), v_car, '33333333-0000-4000-8000-000000000001', date '2026-03-10',
          95000000, 2000000, '[{"nama":"Biaya lelang","nominal":2000000}]'::jsonb)
  returning id into v_purchase;

  perform allocate_purchase_funding(v_purchase,
    jsonb_build_array(jsonb_build_object('investor_id', v_siti, 'amount', 97000000)));
  -- Siti: 500.000.000 - 97.000.000 = 403.000.000

  insert into repairs (car_id, vendor_id, jenis_perbaikan, deskripsi, biaya, tanggal_masuk, tanggal_selesai, status, ambil_dari_modal)
  values (v_car, '44444444-0000-4000-8000-000000000001','Kaki-kaki','Ganti shockbreaker depan & spooring', 4000000, date '2026-03-12', date '2026-03-18','SELESAI', true)
  returning id into v_repair;
  perform allocate_repair_funding(v_repair);
  -- Siti: 403.000.000 - 4.000.000 = 399.000.000 (potongan modal langsung, contoh checkbox aktif)

  update cars set status = 'READY_STOCK' where id = v_car;

  -- =========================================================
  -- UNIT 4 — Daihatsu Xenia 2018 : PERBAIKAN (masih di bengkel)
  -- Dibiayai Andi sendirian, pakai sisa saldonya
  -- =========================================================
  insert into cars (merek, tipe, tahun, warna, no_polisi, no_rangka, no_mesin, transmisi, kilometer, tanggal_pajak, status)
  values ('Daihatsu','Xenia R',2018,'Hitam','B 5566 TUV','MHKV5EA2JJK005566','3SZ005566','MANUAL',92000, date '2026-11-30','DIBELI')
  returning id into v_car;

  insert into purchases (no_transaksi, car_id, supplier_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-06-02'), v_car, '33333333-0000-4000-8000-000000000002', date '2026-06-02',
          60000000, 1000000, '[{"nama":"Biaya derek","nominal":1000000}]'::jsonb)
  returning id into v_purchase;

  perform allocate_purchase_funding(v_purchase,
    jsonb_build_array(jsonb_build_object('investor_id', v_andi, 'amount', 61000000)));
  -- Andi: 207.500.000 - 61.000.000 = 146.500.000

  insert into repairs (car_id, vendor_id, jenis_perbaikan, deskripsi, biaya, tanggal_masuk, status)
  values (v_car, '44444444-0000-4000-8000-000000000001','Body','Perbaikan bumper depan & cat ulang', 6000000, date '2026-07-10','PROSES')
  returning id into v_repair;
  update cars set status = 'PERBAIKAN' where id = v_car;

  -- =========================================================
  -- UNIT 5 — Suzuki Ertiga 2021 : baru DIBELI
  -- Dibiayai Rina sendirian, pakai sisa saldonya
  -- =========================================================
  insert into cars (merek, tipe, tahun, warna, no_polisi, no_rangka, no_mesin, transmisi, kilometer, tanggal_pajak, status)
  values ('Suzuki','Ertiga GX',2021,'Abu-abu','B 7788 WXY','MHYKZE81SMJ007788','K15B007788','MATIC',52000, date '2027-02-18','DIBELI')
  returning id into v_car;

  insert into purchases (no_transaksi, car_id, supplier_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', date '2026-07-18'), v_car, '33333333-0000-4000-8000-000000000001', date '2026-07-18',
          130000000, 3000000, '[{"nama":"Biaya lelang","nominal":2000000},{"nama":"Mutasi","nominal":1000000}]'::jsonb)
  returning id into v_purchase;

  perform allocate_purchase_funding(v_purchase,
    jsonb_build_array(jsonb_build_object('investor_id', v_rina, 'amount', 133000000)));
  -- Rina: 897.500.000 - 133.000.000 = 764.500.000
end $$;

-- ---------------------------------------------------------------------
-- Aset Perusahaan — murni milik pengelola, tidak memotong saldo investor
-- ---------------------------------------------------------------------
insert into company_assets (nama, kategori, tanggal_beli, harga_beli, umur_manfaat_bulan, nilai_residu, catatan) values
  ('Laptop Kasir', 'Elektronik', date '2026-05-04', 9000000, 24, 500000, 'Dipakai admin input transaksi harian'),
  ('AC Showroom 2 PK', 'Peralatan Kantor', date '2026-06-15', 6000000, 60, 0, 'Ruang tunggu customer');

-- ---------------------------------------------------------------------
-- Biaya operasional — HANYA operasional dealer (gaji, sewa, listrik).
-- Biaya per-unit (perbaikan, komisi sales) TIDAK masuk sini, lihat
-- catatan di kepala file.
-- ---------------------------------------------------------------------
insert into operational_expenses (tanggal, kategori, keterangan, nominal) values
  (date '2026-02-28','Gaji','Gaji staf kantor Februari', 8000000),
  (date '2026-03-31','Gaji','Gaji staf kantor Maret', 8000000),
  (date '2026-04-30','Gaji','Gaji staf kantor April', 8000000),
  (date '2026-05-31','Gaji','Gaji staf kantor Mei', 8000000),
  (date '2026-06-30','Gaji','Gaji staf kantor Juni', 8000000),
  (date '2026-03-31','Sewa','Sewa showroom Maret', 6000000),
  (date '2026-04-30','Sewa','Sewa showroom April', 6000000),
  (date '2026-05-31','Sewa','Sewa showroom Mei', 6000000),
  (date '2026-06-30','Sewa','Sewa showroom Juni', 6000000),
  (date '2026-07-05','Listrik','Listrik & internet Juli', 1500000);

commit;

-- Verifikasi cepat: total saldo investor harus sama dengan SUM ledger
-- select * from v_investor_balance;
-- select * from v_dashboard_summary;
