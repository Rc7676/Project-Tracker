-- Project Tracker — shared data schema for Supabase
-- Run this once in your Supabase project:
--   Supabase dashboard → SQL Editor → New query → paste this → Run.

-- One row holds the whole shared workspace as JSON.
create table if not exists public.app_state (
  id          text primary key,
  data        jsonb       not null default '{}'::jsonb,
  updated_by  text,
  updated_at  timestamptz not null default now()
);

-- Row Level Security: only SIGNED-IN users may read/write. The public anon
-- key alone is not enough — a visitor must log in with an account you create.
-- (If you ran an earlier version of this file with "public" policies, this
-- drops them and replaces them with authenticated-only ones.)
alter table public.app_state enable row level security;

drop policy if exists "public read"   on public.app_state;
drop policy if exists "public insert" on public.app_state;
drop policy if exists "public update" on public.app_state;
drop policy if exists "authenticated read"   on public.app_state;
drop policy if exists "authenticated insert" on public.app_state;
drop policy if exists "authenticated update" on public.app_state;

create policy "authenticated read"   on public.app_state for select to authenticated using (true);
create policy "authenticated insert" on public.app_state for insert to authenticated with check (true);
create policy "authenticated update" on public.app_state for update to authenticated using (true) with check (true);

-- Enable realtime so every open tab updates live when someone edits.
-- (Safe to run even if the table is already in the publication.)
do $$
begin
  begin
    alter publication supabase_realtime add table public.app_state;
  exception when duplicate_object then
    null;
  end;
end $$;
