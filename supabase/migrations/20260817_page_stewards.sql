-- And Then — "page stewards": let a memorial's creator add other stewards
-- (co-owners) who get full parity — edit the page, moderate memories,
-- invite further stewards, even delete the memorial. One boundary: the
-- original creator recorded in memorials.steward_id can't be removed or
-- replaced through this feature — that's a separate, more sensitive
-- ownership-transfer operation this migration doesn't attempt.
--
-- Invite flow mirrors access_requests' approve/email pattern: the inviting
-- steward inserts a pending row with a token, an email goes out (see
-- api/notify-steward-invite.js), and the invitee accepts by updating their
-- own row directly under RLS once signed in — same "client update, guarded
-- by policy, no bespoke accept endpoint" shape as PageSettings.jsx's
-- approveRequest already uses for access requests.
--
-- Every steward-scoped policy across memorials/contributions/access_requests
-- previously hardcoded `steward_id = auth.uid()`. All of them are rewritten
-- here to go through is_memorial_steward(), which also recognizes an
-- accepted co-steward. The free-tier contribution INSERT policy gets the
-- same treatment, so a co-steward can add memories on an unpaid page too,
-- not just the original creator.
--
-- Idempotent. Run in Supabase → SQL Editor.

-- 1) memorial_stewards ------------------------------------------------------

create table if not exists public.memorial_stewards (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references public.memorials(id) on delete cascade,
  invited_email text not null,
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  invite_token text unique,
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

-- One pending invite per (memorial, email) — re-inviting while one's still
-- pending should surface the existing one, not pile up duplicates. Same
-- idiom as access_requests_pending_email_idx.
create unique index if not exists memorial_stewards_pending_email_idx
  on public.memorial_stewards (memorial_id, lower(invited_email))
  where status = 'pending';

-- One accepted row per (memorial, user) — can't accept the same invite twice.
create unique index if not exists memorial_stewards_accepted_user_idx
  on public.memorial_stewards (memorial_id, user_id)
  where status = 'accepted';

alter table public.memorial_stewards enable row level security;
revoke all on public.memorial_stewards from anon, authenticated, public;

-- 2) is_memorial_steward() ---------------------------------------------------

-- A policy on memorials/contributions/access_requests can't safely subquery
-- memorial_stewards AND memorials together inline without duplicating this
-- logic seven times over (and a memorials policy subquerying memorials
-- itself needs the SECURITY DEFINER escape hatch anyway — same
-- infinite-recursion issue documented in 20260812_free_tier_limit.sql).
-- One function, reused everywhere a steward check is needed.
create or replace function public.is_memorial_steward(mid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memorials m
    where m.id = mid and m.steward_id = auth.uid()
  ) or exists (
    select 1 from public.memorial_stewards ms
    where ms.memorial_id = mid and ms.user_id = auth.uid() and ms.status = 'accepted'
  );
$$;

-- 3) memorial_stewards policies ---------------------------------------------

-- Any steward (original or accepted co-steward) sees the full roster —
-- pending invites included — for the "Page stewards" settings section.
drop policy if exists "stewards see their co-stewards" on public.memorial_stewards;
create policy "stewards see their co-stewards"
  on public.memorial_stewards for select
  to authenticated
  using (public.is_memorial_steward(memorial_id));
grant select on public.memorial_stewards to authenticated;

-- An invitee (not yet a steward) needs to read their own pending row to
-- confirm/display the invite before accepting — same "checkable by the
-- person it's addressed to" idiom as access_requests' approved-token policy.
-- Matches on the signed-in JWT's email, not anything client-supplied.
drop policy if exists "invitee can see their own pending invite" on public.memorial_stewards;
create policy "invitee can see their own pending invite"
  on public.memorial_stewards for select
  to authenticated
  using (status = 'pending' and lower(invited_email) = lower(auth.jwt() ->> 'email'));

-- Only an existing steward can invite another — and only the fields that
-- define the invite, not status/user_id/accepted_at (so a crafted insert
-- can't self-accept).
drop policy if exists "stewards invite co-stewards" on public.memorial_stewards;
create policy "stewards invite co-stewards"
  on public.memorial_stewards for insert
  to authenticated
  with check (public.is_memorial_steward(memorial_id));
grant insert (memorial_id, invited_email, invite_token, invited_by) on public.memorial_stewards to authenticated;

-- The invitee accepts their own invite by flipping status + attaching their
-- own uid — never someone else's (with check pins user_id = auth.uid()).
drop policy if exists "invitee accepts their invite" on public.memorial_stewards;
create policy "invitee accepts their invite"
  on public.memorial_stewards for update
  to authenticated
  using (status = 'pending' and lower(invited_email) = lower(auth.jwt() ->> 'email'))
  with check (status = 'accepted' and user_id = auth.uid());
grant update (status, user_id, accepted_at) on public.memorial_stewards to authenticated;

-- Any steward can remove any other steward row (full parity) or cancel a
-- pending invite. The original creator has no row here (see header), so
-- this can never remove them.
drop policy if exists "stewards remove co-stewards" on public.memorial_stewards;
create policy "stewards remove co-stewards"
  on public.memorial_stewards for delete
  to authenticated
  using (public.is_memorial_steward(memorial_id));
grant delete on public.memorial_stewards to authenticated;

-- 4) Extend existing steward-scoped policies to recognize co-stewards ------

drop policy if exists "stewards update their memorial" on public.memorials;
create policy "stewards update their memorial"
  on public.memorials for update
  to authenticated
  using (public.is_memorial_steward(id))
  with check (public.is_memorial_steward(id));

drop policy if exists "stewards delete their memorial" on public.memorials;
create policy "stewards delete their memorial"
  on public.memorials for delete
  to authenticated
  using (public.is_memorial_steward(id));

drop policy if exists "stewards see their memories" on public.contributions;
create policy "stewards see their memories"
  on public.contributions for select
  to authenticated
  using (public.is_memorial_steward(memorial_id));

drop policy if exists "stewards moderate their memories" on public.contributions;
create policy "stewards moderate their memories"
  on public.contributions for update
  to authenticated
  using (public.is_memorial_steward(memorial_id))
  with check (true);

drop policy if exists "stewards delete their memories" on public.contributions;
create policy "stewards delete their memories"
  on public.contributions for delete
  to authenticated
  using (public.is_memorial_steward(memorial_id));

drop policy if exists "stewards see their access requests" on public.access_requests;
create policy "stewards see their access requests"
  on public.access_requests for select
  to authenticated
  using (public.is_memorial_steward(memorial_id));

drop policy if exists "stewards manage their access requests" on public.access_requests;
create policy "stewards manage their access requests"
  on public.access_requests for update
  to authenticated
  using (public.is_memorial_steward(memorial_id))
  with check (true);

-- Free-tier insert (20260812_free_tier_limit.sql) only let the original
-- steward_id add the first 5 memories on an unpaid page. A co-steward is a
-- full owner, so they get the same allowance.
drop policy if exists "anyone can contribute to a real memorial" on public.contributions;
create policy "anyone can contribute to a real memorial"
  on public.contributions for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.memorials m
      where m.id = memorial_id
        and (
          m.is_paid
          or (
            public.is_memorial_steward(m.id)
            and public.free_tier_contribution_count(m.id) < 5
          )
        )
    )
  );
