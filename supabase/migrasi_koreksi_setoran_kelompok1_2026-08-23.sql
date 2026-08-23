-- =====================================================================
-- MIGRASI — Koreksi setoran Ari, Surya, Verdi turun ke plafon akad
--
-- Ditemukan bug di simulasi migrasi awal: tie-break "beli diproses
-- duluan kalau tanggal sama dengan jual" bikin perhitungan kebutuhan
-- modal jadi terlalu pesimis untuk 3 investor ini. Setelah disimulasikan
-- ulang dengan urutan realistis (modal dari hasil jual cair duluan,
-- baru dipakai beli unit berikutnya), plafon akad mereka SUDAH CUKUP
-- menutupi seluruh histori transaksi — tidak pernah minus.
--
-- Investor lain (Azka, Rosyid, Johan, Wawan, Defri) TIDAK disentuh di
-- sini — mereka punya kebutuhan riil yang genuinely melebihi plafon,
-- masih menunggu konfirmasi user.
-- =====================================================================

begin;

update investor_ledger set amount = 375000000 where id = '6729c151-5b33-460a-bb87-2b2cbf2ebfc9'; -- Ari
update investor_ledger set amount = 100000000 where id = 'dbc052f3-6fba-4bb6-9d13-bd1bd0c25fb2'; -- Surya
update investor_ledger set amount = 100000000 where id = 'ee6a72e6-f376-4dab-8269-cd532aa77cae'; -- Verdi

commit;
