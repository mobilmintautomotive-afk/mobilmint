-- =====================================================================
-- MIGRASI — Reklasifikasi kolom "Biaya" dari Excel jadi Biaya Perbaikan
--
-- Kolom "Biaya" di setiap sheet investor sumbernya ternyata biaya
-- PERBAIKAN/reconditioning, bukan biaya tambahan pembelian — sebelumnya
-- salah dimasukkan sebagai purchases.biaya_lain. Migrasi ini memindahkan
-- nilainya ke tabel `repairs` (satu baris per unit, tanggal mengikuti
-- tanggal_beli karena sumber tidak punya tanggal perbaikan terpisah).
--
-- NETRAL terhadap HPP, laba, bagi hasil, dan saldo investor: HPP =
-- purchases.total_modal + sum(repairs.biaya), jadi memindahkan nilai
-- dari satu komponen ke komponen lain tidak mengubah total HPP unit
-- manapun. Unit yang SUDAH terjual juga aman — hpp_snapshot di car_sales
-- sudah dikunci saat penjualan, tidak ikut berubah oleh migrasi ini.
--
-- Efek yang BERUBAH: breakdown "Modal Pembelian" vs "Biaya Perbaikan" di
-- laporan/detail unit, dan cash_ledger sekarang punya baris PERBAIKAN
-- terpisah (bukan menyatu di PEMBELIAN_UNIT) — tapi TOTAL & tanggal arus
-- kasnya sama persis, karena tanggal_masuk perbaikan = tanggal_beli.
-- =====================================================================

begin;

do $$
declare
  r record;
begin
  for r in
    select id as purchase_id, car_id, tanggal_beli, biaya_lain
    from purchases
    where biaya_lain > 0
  loop
    insert into repairs (
      car_id, jenis_perbaikan, deskripsi, biaya, tanggal_masuk, tanggal_selesai, status, ambil_dari_modal
    ) values (
      r.car_id, 'Reconditioning', 'Akumulasi biaya perbaikan (migrasi data)',
      r.biaya_lain, r.tanggal_beli, r.tanggal_beli, 'SELESAI', true
    );

    update purchases
    set biaya_lain = 0, rincian_biaya_lain = '[]'::jsonb
    where id = r.purchase_id;
  end loop;
end $$;

commit;
