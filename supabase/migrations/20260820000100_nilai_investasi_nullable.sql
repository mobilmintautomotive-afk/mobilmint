-- =====================================================================
-- Ternak Mercy — Migration 007: nilai_investasi boleh kosong (unlimited)
--
-- Data investor real ternyata ada yang "tanpa plafon" (kesepakatan tidak
-- membatasi nilai investasi maksimum) — nilai_investasi NULL dipakai untuk
-- merepresentasikan itu, bukan angka besar sembarang.
-- =====================================================================

alter table investor_contracts alter column nilai_investasi drop not null;
