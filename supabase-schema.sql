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

-- Row Level Security: anyone holding the public anon key may read/write.
-- This is intentional — the app is meant to be a shared workspace for
-- everyone you give the link to. Do NOT put secrets in it, and keep the
-- app URL private to your team.
alter table public.app_state enable row level security;

drop policy if exists "public read"   on public.app_state;
drop policy if exists "public insert" on public.app_state;
drop policy if exists "public update" on public.app_state;

create policy "public read"   on public.app_state for select using (true);
create policy "public insert" on public.app_state for insert with check (true);
create policy "public update" on public.app_state for update using (true) with check (true);

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
