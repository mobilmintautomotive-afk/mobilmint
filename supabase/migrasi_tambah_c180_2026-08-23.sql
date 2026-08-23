-- =====================================================================
-- MIGRASI — Tambah unit yang sebelumnya dilewati: Mercedes Benz C180
--
-- Satu-satunya baris di sumber Excel yang tidak punya tahun (Rosyid).
-- User mengonfirmasi tahunnya 2004. Belum laku (tidak ada Tanggal Jual /
-- Harga Jual di sumber), jadi masuk sebagai unit stok biasa (READY_STOCK).
-- Biaya (Rp17.900.000) dicatat sebagai record `repairs`, sesuai pola
-- reklasifikasi yang sudah diterapkan ke seluruh unit lain.
-- =====================================================================

begin;

do $$
declare
  v_car uuid;
  v_purchase uuid;
  v_repair uuid;
  v_investor uuid := '99999999-0000-4000-8000-000000000003'; -- Rosyid
  v_contract uuid := 'b4a40ba9-1140-4f57-9e6b-55603af055a4';
  v_tgl date := date '2026-06-24';
begin
  insert into cars (merek, tipe, tahun, status, catatan)
  values ('Mercedes Benz', 'C180', 2004, 'DIBELI', 'Migrasi data — sebelumnya dilewati karena tanpa tahun, dikonfirmasi 2004')
  returning id into v_car;

  insert into purchases (no_transaksi, car_id, tanggal_beli, harga_beli, biaya_lain, rincian_biaya_lain)
  values (fn_next_doc_number('BLI', v_tgl), v_car, v_tgl, 39500000, 0, '[]'::jsonb)
  returning id into v_purchase;

  perform allocate_purchase_funding(v_purchase, jsonb_build_array(jsonb_build_object('investor_id', v_investor, 'amount', 39500000)));

  insert into repairs (car_id, jenis_perbaikan, deskripsi, biaya, tanggal_masuk, tanggal_selesai, status, ambil_dari_modal)
  values (v_car, 'Reconditioning', 'Akumulasi biaya perbaikan (migrasi data)', 17900000, v_tgl, v_tgl, 'SELESAI', true)
  returning id into v_repair;

  update car_fundings set amount = amount + 17900000 where car_id = v_car and investor_id = v_investor;

  insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
  values (v_investor, v_contract, 'ALOKASI_MODAL', -17900000, 'Alokasi biaya perbaikan Mercedes Benz C180 2004', 'repairs', v_repair, v_tgl);

  update cars set status = 'READY_STOCK' where id = v_car;
end $$;

commit;
