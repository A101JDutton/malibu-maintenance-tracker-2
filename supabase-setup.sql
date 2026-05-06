-- Run this in Supabase SQL Editor

create table if not exists settings (
  user_id text primary key,
  current_mileage integer default 0,
  interval_miles integer default 5000,
  updated_at timestamptz default now()
);

create table if not exists maintenance_records (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
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

alter table settings enable row level security;
alter table maintenance_records enable row level security;

drop policy if exists "allow anon settings" on settings;
drop policy if exists "allow anon records" on maintenance_records;

create policy "allow anon settings"
on settings for all
to anon
using (true)
with check (true);

create policy "allow anon records"
on maintenance_records for all
to anon
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('maintenance-photos', 'maintenance-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "allow anon photo uploads" on storage.objects;
drop policy if exists "allow anon photo reads" on storage.objects;
drop policy if exists "allow anon photo deletes" on storage.objects;

create policy "allow anon photo uploads"
on storage.objects for insert
to anon
with check (bucket_id = 'maintenance-photos');

create policy "allow anon photo reads"
on storage.objects for select
to anon
using (bucket_id = 'maintenance-photos');

create policy "allow anon photo deletes"
on storage.objects for delete
to anon
using (bucket_id = 'maintenance-photos');
