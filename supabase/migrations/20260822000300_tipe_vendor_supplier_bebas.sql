-- =====================================================================
-- MobilMint — Migration: tipe_vendor & tipe_supplier jadi teks bebas
--
-- Sebelumnya enum tertutup (BENGKEL/SALON/SPARE_PART/BODY_REPAIR/LAINNYA
-- dan LELANG/MEDIATOR/FOLLOWERS). Disamakan dengan pola kategori lain
-- (jenis_perbaikan, kategori opex, kategori aset) yang cuma kolom teks
-- biasa, supaya dropdown-nya bisa "Tambah Kategori" langsung dari form.
-- =====================================================================

alter table vendors alter column tipe_vendor type text using tipe_vendor::text;
alter table suppliers alter column tipe_supplier type text using tipe_supplier::text;

drop type if exists vendor_type;
drop type if exists supplier_type;
