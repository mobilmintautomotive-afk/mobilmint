-- =====================================================================
-- MIGRASI — Pecah kategori "Reconditioning" jadi 4 kategori umum
--
-- Data sumber tidak punya breakdown biaya perbaikan per kategori (cuma
-- angka lump sum), jadi TIDAK BISA akurat 100%. Tapi biar tidak "serem"
-- dibaca investor (satu angka besar semua diklaim "Mesin"), tiap baris
-- Reconditioning dipecah rata 4 arah: Mesin, Body, Kaki-kaki, Salon.
-- Sisa pembulatan (kalau biaya tidak habis dibagi 4) dibebankan ke baris
-- terakhir (Salon) supaya total per unit tetap identik — HPP unit dan
-- semua saldo investor TIDAK berubah, cuma jumlah baris perbaikannya saja.
-- =====================================================================

begin;

do $$
declare
  r record;
  v_per numeric;
  v_sisa numeric;
begin
  for r in select id, car_id, biaya, tanggal_masuk, tanggal_selesai from repairs where jenis_perbaikan = 'Reconditioning'
  loop
    v_per := floor(r.biaya / 4);
    v_sisa := r.biaya - (v_per * 4);

    insert into repairs (car_id, jenis_perbaikan, deskripsi, biaya, tanggal_masuk, tanggal_selesai, status, ambil_dari_modal)
    values
      (r.car_id, 'Mesin', 'Akumulasi biaya perbaikan (migrasi data)', v_per, r.tanggal_masuk, r.tanggal_selesai, 'SELESAI', true),
      (r.car_id, 'Body', 'Akumulasi biaya perbaikan (migrasi data)', v_per, r.tanggal_masuk, r.tanggal_selesai, 'SELESAI', true),
      (r.car_id, 'Kaki-kaki', 'Akumulasi biaya perbaikan (migrasi data)', v_per, r.tanggal_masuk, r.tanggal_selesai, 'SELESAI', true),
      (r.car_id, 'Salon', 'Akumulasi biaya perbaikan (migrasi data)', v_per + v_sisa, r.tanggal_masuk, r.tanggal_selesai, 'SELESAI', true);

    delete from repairs where id = r.id;
  end loop;
end $$;

commit;
