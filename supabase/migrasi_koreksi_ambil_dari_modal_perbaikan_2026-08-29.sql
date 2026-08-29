-- =====================================================================
-- KOREKSI — Matikan flag ambil_dari_modal yang salah di 348 baris
-- "Akumulasi biaya perbaikan (migrasi data)"
--
-- Latar belakang: migrasi 22 Agustus 2026 (migrasi_reklasifikasi_biaya_
-- perbaikan_2026-08-22.sql) memindahkan kolom "Biaya" dari Excel —
-- semula tersimpan di purchases.biaya_lain — ke tabel `repairs` supaya
-- laporan bisa memisahkan "Modal Pembelian" vs "Biaya Perbaikan". Script
-- itu keliru menandai ambil_dari_modal = true di setiap baris yang
-- dipindahkan.
--
-- Padahal modal investor untuk unit-unit itu SUDAH terkunci penuh saat
-- pembelian dicatat (car_fundings.amount = harga_beli + biaya_lain saat
-- itu, SEBELUM dipisah) — dibuktikan lewat pengecekan per-unit maupun
-- total (harga_beli + biaya migrasi = total car_fundings, cocok persis
-- di semua unit yang diperiksa). Kalau ambil_dari_modal=true ini sempat
-- diproses (memanggil allocate_repair_funding), saldo investor akan
-- terpotong DUA KALI untuk uang yang sama.
--
-- Untungnya baris-baris ini di-insert langsung lewat SQL (bukan lewat
-- form aplikasi), jadi allocate_repair_funding belum pernah kepanggil
-- untuk baris-baris ini — dikonfirmasi 0 baris investor_ledger dengan
-- ref_table='repairs' yang mengarah ke baris-baris ini. Migrasi ini
-- MURNI mematikan flag yang salah, tidak menyentuh cash_ledger,
-- investor_ledger, HPP, atau saldo investor sama sekali.
--
-- Diverifikasi sebelum & sesudah (identik):
--   cash_ledger tipe PERBAIKAN : 368 baris, total -568.214.000
--   investor_ledger            : 355 baris, total  320.455.000
--   total HPP (v_car_hpp)      : 6.916.390.000
--   total saldo investor       : 320.455.000
-- =====================================================================

begin;

update repairs
set ambil_dari_modal = false
where deskripsi = 'Akumulasi biaya perbaikan (migrasi data)'
  and ambil_dari_modal = true
  and not exists (
    select 1 from investor_ledger il
    where il.ref_table = 'repairs' and il.ref_id = repairs.id
  );

-- Harus tepat 348 baris -- kalau tidak, ROLLBACK dan cek ulang manual.
do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from repairs
  where deskripsi = 'Akumulasi biaya perbaikan (migrasi data)'
    and ambil_dari_modal = false;

  if v_count <> 348 then
    raise exception 'Jumlah baris ter-koreksi (%) tidak sesuai ekspektasi (348)', v_count;
  end if;
end $$;

commit;
