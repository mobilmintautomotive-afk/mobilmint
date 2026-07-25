-- =====================================================================
-- MobilMint — Row Level Security (FASE 5)
--
-- JANGAN dijalankan selama Fase 1–4. Selama role masih dummy (cookie),
-- belum ada auth.uid() sehingga semua policy di bawah akan memblokir
-- seluruh query dan aplikasi tampak kosong.
--
-- Jalankan file ini SETELAH Supabase Auth aktif dan lib/dev-role.ts
-- sudah diganti membaca session (PRD 05 bagian 1.3 & 2).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Helper
-- ---------------------------------------------------------------------
create or replace function auth_role() returns user_role as $$
  select role from profiles where auth_user_id = auth.uid() and is_active limit 1;
$$ language sql stable security definer;

create or replace function auth_investor_id() returns uuid as $$
  select investor_id from profiles where auth_user_id = auth.uid() and is_active limit 1;
$$ language sql stable security definer;

-- ---------------------------------------------------------------------
-- 2. Tabel operasional — admin penuh, holding baca saja, investor tidak
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'suppliers','vendors','customers','sales_persons','investment_tiers',
    'investors','purchases','repairs','car_sales','operational_expenses',
    'profit_sharings','app_settings'
  ]
  loop
    execute format('alter table %I enable row level security', t);

    execute format(
      'drop policy if exists "admin full access" on %I', t);
    execute format(
      'create policy "admin full access" on %I for all
         using (auth_role() = ''admin'') with check (auth_role() = ''admin'')', t);

    execute format(
      'drop policy if exists "holding read only" on %I', t);
    execute format(
      'create policy "holding read only" on %I for select
         using (auth_role() in (''admin'',''holding''))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3. Mobil — investor boleh melihat unit yang DIA danai saja
-- ---------------------------------------------------------------------
alter table cars enable row level security;

drop policy if exists "admin full access" on cars;
create policy "admin full access" on cars
  for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

drop policy if exists "holding read only" on cars;
create policy "holding read only" on cars
  for select using (auth_role() in ('admin','holding'));

drop policy if exists "investor read funded cars" on cars;
create policy "investor read funded cars" on cars
  for select using (
    auth_role() = 'investor'
    and exists (
      select 1 from car_fundings f
      where f.car_id = cars.id and f.investor_id = auth_investor_id()
    )
  );

-- ---------------------------------------------------------------------
-- 4. Buku besar — investor hanya barisnya sendiri, dan tidak boleh menulis
-- ---------------------------------------------------------------------
alter table investor_ledger enable row level security;

drop policy if exists "admin holding read ledger" on investor_ledger;
create policy "admin holding read ledger" on investor_ledger
  for select using (auth_role() in ('admin','holding'));

drop policy if exists "investor read own ledger" on investor_ledger;
create policy "investor read own ledger" on investor_ledger
  for select using (auth_role() = 'investor' and investor_id = auth_investor_id());

drop policy if exists "admin write ledger" on investor_ledger;
create policy "admin write ledger" on investor_ledger
  for insert with check (auth_role() = 'admin');

-- Pola yang sama untuk tabel berisi data per-investor
do $$
declare
  t text;
begin
  foreach t in array array['car_fundings','profit_sharing_details','investor_contracts']
  loop
    execute format('alter table %I enable row level security', t);

    execute format('drop policy if exists "admin full access" on %I', t);
    execute format(
      'create policy "admin full access" on %I for all
         using (auth_role() = ''admin'') with check (auth_role() = ''admin'')', t);

    execute format('drop policy if exists "holding read only" on %I', t);
    execute format(
      'create policy "holding read only" on %I for select
         using (auth_role() in (''admin'',''holding''))', t);

    execute format('drop policy if exists "investor read own rows" on %I', t);
    execute format(
      'create policy "investor read own rows" on %I for select
         using (auth_role() = ''investor'' and investor_id = auth_investor_id())', t);
  end loop;
end $$;

-- Investor juga boleh melihat header bagi hasil untuk unit yang dia danai
drop policy if exists "investor read own sharing" on profit_sharings;
create policy "investor read own sharing" on profit_sharings
  for select using (
    auth_role() = 'investor'
    and exists (
      select 1 from car_fundings f
      where f.car_id = profit_sharings.car_id and f.investor_id = auth_investor_id()
    )
  );

-- Investor boleh melihat data dirinya sendiri di master investor
drop policy if exists "investor read own profile row" on investors;
create policy "investor read own profile row" on investors
  for select using (auth_role() = 'investor' and id = auth_investor_id());

-- ---------------------------------------------------------------------
-- 5. Profiles
-- ---------------------------------------------------------------------
alter table profiles enable row level security;

drop policy if exists "read own profile" on profiles;
create policy "read own profile" on profiles
  for select using (auth_user_id = auth.uid());

drop policy if exists "admin manage profiles" on profiles;
create policy "admin manage profiles" on profiles
  for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ---------------------------------------------------------------------
-- 6. View ikut RLS tabel dasarnya
-- ---------------------------------------------------------------------
alter view v_car_hpp          set (security_invoker = on);
alter view v_investor_balance set (security_invoker = on);
alter view v_car_overview     set (security_invoker = on);
-- v_dashboard_summary sengaja TIDAK di-invoker: aksesnya dibatasi lewat
-- server action yang mengecek role dulu (PRD 05 bagian 2).

-- ---------------------------------------------------------------------
-- 7. Storage
-- ---------------------------------------------------------------------
-- Bucket 'car-photos'  : boleh dibaca semua user login
-- Bucket 'documents'   : hanya admin + investor pemilik akad
--
-- insert into storage.buckets (id, name, public) values ('car-photos','car-photos', true)
--   on conflict (id) do nothing;
-- insert into storage.buckets (id, name, public) values ('documents','documents', false)
--   on conflict (id) do nothing;

drop policy if exists "car photos read" on storage.objects;
create policy "car photos read" on storage.objects
  for select using (bucket_id = 'car-photos' and auth.role() = 'authenticated');

drop policy if exists "car photos write admin" on storage.objects;
create policy "car photos write admin" on storage.objects
  for insert with check (bucket_id = 'car-photos' and auth_role() = 'admin');

drop policy if exists "documents admin only" on storage.objects;
create policy "documents admin only" on storage.objects
  for all using (bucket_id = 'documents' and auth_role() = 'admin')
  with check (bucket_id = 'documents' and auth_role() = 'admin');
