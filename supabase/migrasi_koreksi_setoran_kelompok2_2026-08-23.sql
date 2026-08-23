-- =====================================================================
-- MIGRASI — Koreksi setoran Azka, Rosyid, Johan, Defri, Wawan ke plafon
--
-- Dikonfirmasi user: kelima investor ini SEBENARNYA tidak pernah kirim
-- dana tambahan di luar plafon akad mereka. Momen di mana kebutuhan
-- modal historis mereka sempat melampaui plafon (2 unit nyangkut
-- bersamaan sebelum salah satu laku, atau harga satu unit di atas
-- plafon) itu ditutup sementara pakai dana idle investor lain di pool
-- (dikembalikan lagi begitu unit laku, tanpa bagi hasil untuk pinjaman
-- itu) — bukan modal pribadi investor yang bersangkutan.
--
-- Ke depannya ini sudah dikunci sistem: allocate_purchase_funding selalu
-- mengecek saldo investor dulu, jadi kejadian serupa tidak akan lolos lagi.
-- =====================================================================

begin;

update investor_ledger set amount = 85000000  where id = 'a4e66007-4e7a-474e-9c36-55c973d57af9'; -- Azka
update investor_ledger set amount = 100000000 where id = 'b9a667c5-72c8-46c3-921f-7c0d2d30f36f'; -- Rosyid
update investor_ledger set amount = 100000000 where id = '0dee2645-ee4f-4497-8d4a-93cbda08a619'; -- Johan
update investor_ledger set amount = 100000000 where id = '564f7b1d-5c12-40a7-a183-c9373b710c36'; -- Defri
update investor_ledger set amount = 100000000 where id = '00d61a07-d55e-4c5a-9d33-2ae9638b70bd'; -- Wawan

commit;
