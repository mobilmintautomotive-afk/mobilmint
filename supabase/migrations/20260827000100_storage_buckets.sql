-- =====================================================================
-- MobilMint — Migration: bucket Storage (car-photos & documents)
--
-- Terlewat waktu migrasi project Supabase lama -> baru (24 Agustus 2026):
-- migrasi sebelumnya cuma copy skema+data tabel `public.*` lewat SQL,
-- padahal bucket Storage adalah objek terpisah (tabel storage.buckets)
-- yang harus dibuat ulang manual. Ini yang bikin upload foto mobil gagal
-- di project baru — bucket-nya belum ada sama sekali.
-- =====================================================================

insert into storage.buckets (id, name, public)
values
  ('car-photos', 'car-photos', true),
  ('documents', 'documents', false)
on conflict (id) do nothing;

-- car-photos: diupload langsung dari browser (anon key + session login),
-- jadi butuh policy RLS di storage.objects. Bucket public=true supaya
-- getPublicUrl() bisa diakses tanpa auth (foto ditampilkan di banyak
-- tempat termasuk dashboard investor).
create policy "car-photos insert oleh user login"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'car-photos');

create policy "car-photos select oleh user login"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'car-photos');

create policy "car-photos delete oleh user login"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'car-photos');

-- documents: privat, cuma pernah disentuh lewat service-role client di
-- server (app/actions/upload.ts) yang otomatis bypass RLS -- sengaja
-- tidak dikasih policy anon/authenticated sama sekali.
