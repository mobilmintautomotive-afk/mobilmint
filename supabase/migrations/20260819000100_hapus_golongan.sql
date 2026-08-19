-- =====================================================================
-- Ternak Mercy — Migration 006: Hapus Golongan Investasi
--
-- Awalnya nisbah/nilai investasi investor ditentukan lewat "Golongan
-- Investasi" — preset tier bersama (mis. semua investor di golongan
-- "0-200jt" otomatis dapat nisbah 30%). Prakteknya nisbah itu hasil
-- kesepakatan PER INDIVIDU investor, bukan mengikuti tabel golongan
-- bersama, dan kesepakatan itu bisa berubah kalau investor menambah
-- investasi di kemudian hari.
--
-- investor_contracts SUDAH punya kolom nisbah_investor_pct,
-- nisbah_pengelola_pct, nilai_investasi sendiri (snapshot per akad) dan
-- tanggal_akad sebagai tanggal berlaku kesepakatan — jadi perubahan ini
-- murni melepas ketergantungan wajibnya ke investment_tiers, bukan
-- redesain skema.
-- =====================================================================

alter table investor_contracts drop column if exists tier_id;
drop table if exists investment_tiers;
