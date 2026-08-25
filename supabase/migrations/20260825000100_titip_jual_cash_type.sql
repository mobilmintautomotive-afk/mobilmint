-- =====================================================================
-- MobilMint — Migration: cash_type PENDAPATAN_TITIP_JUAL
--
-- ALTER TYPE ADD VALUE harus commit sendiri dulu sebelum value barunya
-- dipakai di migration berikutnya (pembatasan Postgres), makanya file ini
-- terpisah dari migration tabel `consignments` (lihat 20260822000100 utk
-- pola yang sama waktu nambah TERBOOKING ke car_status).
-- =====================================================================

alter type cash_type add value if not exists 'PENDAPATAN_TITIP_JUAL';
