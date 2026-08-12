-- And Then — page access control (invite-only vs public) + access requests.
--
-- Two new things:
--  1. memorials.access_mode: 'invite_only' | 'public'. Existing pages are
--     backfilled to 'public' (preserving today's real behavior — anyone
--     with a page's link can already contribute, since nothing has ever
--     checked how a visitor arrived); the column default is 'invite_only'
--     for every memorial created from here on, matching the app's new
--     default going forward without silently locking out real families'
--     already-live pages the moment this migration runs.
--  2. access_requests: a request from a visitor without a valid invite to
--     be let in. Approving one generates a reusable contribute_token that
--     gets emailed to the requester as a personal link.
--
-- "Valid invite" for the invite_only gate = arrived via the memorial's
-- invite_code (?memorial=<code>) specifically — not the vanity slug, which
-- behaves as a more public/memorable address. See Memorial.jsx's
-- canContribute().
--
-- Idempotent. Run in Supabase → SQL Editor.

-- 1) access_mode ----------------------------------------------------------

alter table public.memorials add column if not exists access_mode text;
update public.memorials set access_mode = 'public' where access_mode is null;
alter table public.memorials alter column access_mode set default 'invite_only';
alter table public.memorials alter column access_mode set not null;

alter table public.memorials drop constraint if exists memorials_access_mode_check;
alter table public.memorials
  add constraint memorials_access_mode_check check (access_mode in ('invite_only', 'public'));

grant update (access_mode) on public.memorials to authenticated;

-- 2) access_requests -------------------------------------------------------

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references public.memorials(id) on delete cascade,
  requester_name text,
  requester_email text not null,
  relationship text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  contribute_token text unique,
  token_used_at timestamptz,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

-- One pending request per (memorial, email) — resubmitting while a request
-- is still pending surfaces the existing one instead of piling up
-- duplicates. The app can't pre-check for a duplicate under RLS (a visitor
-- can't read other people's pending requests), so it just inserts and
-- treats a 23505 conflict on this index the same as a fresh success.
create unique index if not exists access_requests_pending_email_idx
  on public.access_requests (memorial_id, lower(requester_email))
  where status = 'pending';

-- Added after initial ship: notify-access-request.js dedupes on this the
-- same way notify-creator.js dedupes contribution notifications, and an
-- anon INSERT can't use .select() to read its own row back (the "approved
-- tokens are checkable" SELECT policy doesn't cover a fresh 'pending' row,
-- and PostgREST rejects the whole INSERT if the RETURNING clause has
-- nothing it's allowed to see) — so the client can't hand back an id anyway.
alter table public.access_requests add column if not exists notified_at timestamptz;

alter table public.access_requests enable row level security;

-- This table holds requester PII (name, email, note), so — like
-- contributor_email and is_paid elsewhere in this schema — it gets explicit
-- revoke/grant column scoping layered on top of RLS rather than relying on
-- default table privileges.
revoke all on public.access_requests from anon, authenticated, public;

-- Anyone may ask, but only against a real memorial (same idiom as
-- contributions' insert policy), and only the request's own fields — not
-- status/contribute_token/approved_at, so a crafted insert can't self-approve.
drop policy if exists "anyone can request access to a real memorial" on public.access_requests;
create policy "anyone can request access to a real memorial"
  on public.access_requests for insert
  to anon, authenticated
  with check (exists (select 1 from public.memorials m where m.id = memorial_id));
grant insert (memorial_id, requester_name, requester_email, relationship, note)
  on public.access_requests to anon, authenticated;

-- A memorial's steward sees every request on it (pending included) for the
-- settings screen.
drop policy if exists "stewards see their access requests" on public.access_requests;
create policy "stewards see their access requests"
  on public.access_requests for select
  to authenticated
  using (exists (
    select 1 from public.memorials m
    where m.id = access_requests.memorial_id and m.steward_id = auth.uid()
  ));
grant select on public.access_requests to authenticated;

-- Only the steward can approve/decline — and only those three columns, so
-- they can't rewrite what a requester actually said.
drop policy if exists "stewards manage their access requests" on public.access_requests;
create policy "stewards manage their access requests"
  on public.access_requests for update
  to authenticated
  using (exists (
    select 1 from public.memorials m
    where m.id = access_requests.memorial_id and m.steward_id = auth.uid()
  ))
  with check (true);
grant update (status, contribute_token, approved_at) on public.access_requests to authenticated;

-- An approved request's token becomes a public credential a visitor
-- presents back via ?token=. Anon may check it (id/memorial_id/token/status
-- only — never the requester's name/email/note) and mark its own first use.
drop policy if exists "approved tokens are checkable" on public.access_requests;
create policy "approved tokens are checkable"
  on public.access_requests for select
  to anon
  using (status = 'approved');
-- token_used_at is included here (not just for authenticated) because the
-- visitor's own "mark my token used" update below filters on
-- `token_used_at is null`, and evaluating a WHERE clause on a column
-- requires SELECT on it, not just UPDATE.
grant select (id, memorial_id, contribute_token, status, token_used_at) on public.access_requests to anon;

drop policy if exists "a visitor can mark their token used" on public.access_requests;
create policy "a visitor can mark their token used"
  on public.access_requests for update
  to anon, authenticated
  using (status = 'approved')
  with check (status = 'approved');
grant update (token_used_at) on public.access_requests to anon, authenticated;
