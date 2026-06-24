-- And Then — fix `contributions` schema + RLS so memories save.
--
-- Context: the live `contributions` table was missing four columns the app
-- writes (contributor_name, contributor_relation, type, media_url), so every
-- submission failed with PGRST204. `memorials` was already complete and its
-- RLS was already correct, so this migration only touches `contributions`.
--
-- Safe to run more than once (idempotent). Run in Supabase → SQL Editor.

-- 1) Add the missing columns the app inserts.
alter table public.contributions
  add column if not exists contributor_name     text,
  add column if not exists contributor_relation text,
  add column if not exists type                 text not null default 'story',
  add column if not exists media_url            text;

-- 1b) `author` is a leftover NOT NULL column from an earlier schema; the app
-- writes contributor_name instead and never sets it. Drop the NOT NULL so
-- submissions can insert. (Non-destructive — existing data is untouched.)
alter table public.contributions alter column author drop not null;

-- 2) Ensure Row Level Security is on.
alter table public.contributions enable row level security;

-- 3) Policies (dropped first so this stays idempotent).

-- Contributors are anonymous (no login). Anyone may add a memory, but only
-- to a memorial that actually exists.
drop policy if exists "anyone can contribute to a real memorial" on public.contributions;
create policy "anyone can contribute to a real memorial"
  on public.contributions for insert
  to anon, authenticated
  with check (exists (select 1 from public.memorials m where m.id = memorial_id));

-- Approved memories are public (covers both moderation modes: when a memorial
-- doesn't require approval, the app stores submissions as 'approved' directly).
drop policy if exists "approved memories are public" on public.contributions;
create policy "approved memories are public"
  on public.contributions for select
  to anon, authenticated
  using (status = 'approved');

-- A memorial's steward sees every memory on it (pending included) for the
-- moderation queue.
drop policy if exists "stewards see their memories" on public.contributions;
create policy "stewards see their memories"
  on public.contributions for select
  to authenticated
  using (exists (
    select 1 from public.memorials m
    where m.id = contributions.memorial_id and m.steward_id = auth.uid()
  ));

-- Only the steward can approve/reject or remove memories on their memorial.
drop policy if exists "stewards moderate their memories" on public.contributions;
create policy "stewards moderate their memories"
  on public.contributions for update
  to authenticated
  using (exists (
    select 1 from public.memorials m
    where m.id = contributions.memorial_id and m.steward_id = auth.uid()
  ))
  with check (true);

drop policy if exists "stewards delete their memories" on public.contributions;
create policy "stewards delete their memories"
  on public.contributions for delete
  to authenticated
  using (exists (
    select 1 from public.memorials m
    where m.id = contributions.memorial_id and m.steward_id = auth.uid()
  ));
