-- =====================================================================
-- MobilMint — Migration: status unit TERBOOKING
--
-- Skema DP/booking: customer bayar DP dulu, unit ditahan (status berubah
-- jadi TERBOOKING, tidak muncul lagi di "Ready Stock" buat pembeli lain)
-- sampai pelunasan selesai dan jadi penjualan penuh yang sebenarnya.
--
-- ALTER TYPE ADD VALUE harus commit sendiri dulu sebelum value barunya
-- dipakai di migration berikutnya (pembatasan Postgres), makanya file ini
-- terpisah dari migration tabel `bookings`.
-- =====================================================================

alter type car_status add value if not exists 'TERBOOKING' after 'READY_STOCK';
