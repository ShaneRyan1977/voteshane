-- Supabase setup / migration for the Area A Canvass Map.
-- Safe to run on a new project or on the previous prototype table.

create table if not exists public.canvass_status (
  parcel_id text primary key,
  status text not null default 'unvisited',
  "user" text,
  phone text,
  email text,
  voter_names jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Migration from the earlier claimed/visited version.
alter table public.canvass_status drop constraint if exists canvass_status_status_check;
alter table public.canvass_status alter column "user" drop not null;
alter table public.canvass_status add column if not exists phone text;
alter table public.canvass_status add column if not exists email text;
alter table public.canvass_status add column if not exists voter_names jsonb default '{}'::jsonb;
update public.canvass_status set voter_names='{}'::jsonb where voter_names is null;
alter table public.canvass_status alter column voter_names set default '{}'::jsonb;
alter table public.canvass_status alter column voter_names set not null;
update public.canvass_status set status='reachout' where status='claimed';
update public.canvass_status set status='unvisited' where status is null;
alter table public.canvass_status alter column status set default 'unvisited';
alter table public.canvass_status add constraint canvass_status_status_check
  check (status in ('unvisited','supporter','visited','reachout','against'));

alter table public.canvass_status enable row level security;
drop policy if exists "authenticated read" on public.canvass_status;
drop policy if exists "authenticated insert" on public.canvass_status;
drop policy if exists "authenticated update" on public.canvass_status;
drop policy if exists "authenticated delete" on public.canvass_status;
create policy "authenticated read" on public.canvass_status for select to authenticated using (true);
create policy "authenticated insert" on public.canvass_status for insert to authenticated with check (true);
create policy "authenticated update" on public.canvass_status for update to authenticated using (true) with check (true);
create policy "authenticated delete" on public.canvass_status for delete to authenticated using (true);

-- In Supabase Dashboard: Authentication > Providers, enable Anonymous Sign-Ins.
-- Enable Realtime for canvass_status in Database > Publications.
