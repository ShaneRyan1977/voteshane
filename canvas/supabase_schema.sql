-- Supabase setup for the Area A Canvass Map prototype
create table if not exists public.canvass_status (
  parcel_id text primary key,
  status text not null check (status in ('claimed','visited')),
  "user" text not null,
  updated_at timestamptz not null default now()
);
alter table public.canvass_status enable row level security;
create policy "authenticated read" on public.canvass_status for select to authenticated using (true);
create policy "authenticated insert" on public.canvass_status for insert to authenticated with check (true);
create policy "authenticated update" on public.canvass_status for update to authenticated using (true) with check (true);
create policy "authenticated delete" on public.canvass_status for delete to authenticated using (true);
-- In Supabase Dashboard: Authentication > Providers, enable Anonymous Sign-Ins.
-- Then change app.js connect() to call: await supa.auth.signInAnonymously(); before querying.
-- Enable Realtime for canvass_status in Database > Publications.
