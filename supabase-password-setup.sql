-- PASSWORD LOGIN VERSION
-- Public view, only gageshaw73@gmail.com can add/delete/edit.
-- Run this in Supabase SQL Editor.

create table if not exists public_settings (
  id integer primary key default 1,
  current_mileage integer default 0,
  interval_miles integer default 5000,
  updated_at timestamptz default now()
);

create table if not exists maintenance_records (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  mileage integer not null,
  service_type text not null,
  oil_spec text,
  oil_brand text,
  filter_brand text,
  cost numeric,
  receipt_photo_url text,
  odometer_photo_url text,
  notes text,
  created_at timestamptz default now()
);

alter table public_settings enable row level security;
alter table maintenance_records enable row level security;

drop policy if exists "public read settings" on public_settings;
drop policy if exists "owner write settings" on public_settings;
drop policy if exists "public read records" on maintenance_records;
drop policy if exists "owner insert records" on maintenance_records;
drop policy if exists "owner delete records" on maintenance_records;
drop policy if exists "owner update records" on maintenance_records;

create policy "public read settings"
on public_settings for select
to anon, authenticated
using (true);

create policy "public read records"
on maintenance_records for select
to anon, authenticated
using (true);

create policy "owner write settings"
on public_settings for all
to authenticated
using ((auth.jwt() ->> 'email') = 'gageshaw73@gmail.com')
with check ((auth.jwt() ->> 'email') = 'gageshaw73@gmail.com');

create policy "owner insert records"
on maintenance_records for insert
to authenticated
with check ((auth.jwt() ->> 'email') = 'gageshaw73@gmail.com');

create policy "owner update records"
on maintenance_records for update
to authenticated
using ((auth.jwt() ->> 'email') = 'gageshaw73@gmail.com')
with check ((auth.jwt() ->> 'email') = 'gageshaw73@gmail.com');

create policy "owner delete records"
on maintenance_records for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'gageshaw73@gmail.com');

insert into storage.buckets (id, name, public)
values ('maintenance-photos', 'maintenance-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "public read photos" on storage.objects;
drop policy if exists "owner upload photos" on storage.objects;
drop policy if exists "owner delete photos" on storage.objects;

create policy "public read photos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'maintenance-photos');

create policy "owner upload photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'maintenance-photos'
  and (auth.jwt() ->> 'email') = 'gageshaw73@gmail.com'
);

create policy "owner delete photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'maintenance-photos'
  and (auth.jwt() ->> 'email') = 'gageshaw73@gmail.com'
);

insert into public_settings (id, current_mileage, interval_miles)
values (1, 0, 5000)
on conflict (id) do nothing;
