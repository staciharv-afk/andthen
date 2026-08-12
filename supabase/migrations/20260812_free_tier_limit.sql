-- And Then — free tier: cap at 5 memories, and only the steward can add
-- them until the page is paid.
--
-- "Five memories included, free" was previously just marketing copy on the
-- Pricing/How It Works pages — nothing enforced it. This makes it real by
-- rewriting the contributions INSERT policy:
--   - A paid memorial (is_paid = true): unchanged, anyone may contribute
--     (subject to the app's own invite/access-mode gating, which is a UI/
--     RLS concern on a different table — see 20260812_access_control.sql).
--   - An unpaid memorial: ONLY the steward, signed in, may insert — and
--     only while their non-rejected contribution count is under 5.
--     Contributors never sign in (magic-link is steward-only), so
--     auth.uid() = m.steward_id can only ever be true for the steward
--     previewing their own page — this is what makes "can't share it
--     beyond themselves" a real server-enforced boundary, not just a UI
--     nicety a technical visitor could bypass by hitting the API directly.
-- Excluding 'rejected' from the count means removing a memory frees a
-- slot — "5 live memories," not "5 lifetime attempts."
--
-- A policy on contributions can't safely subquery contributions directly —
-- Postgres reports "infinite recursion detected in policy" (confirmed
-- against the real database while writing this). The documented fix: a
-- SECURITY DEFINER function, which runs as its owner and so isn't subject
-- to contributions' own RLS policies when it reads from the table — that's
-- what breaks the cycle.
create or replace function public.free_tier_contribution_count(p_memorial_id uuid)
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*) from public.contributions
  where memorial_id = p_memorial_id and status <> 'rejected';
$$;

-- Run in Supabase → SQL Editor. Idempotent.

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
            auth.uid() = m.steward_id
            and public.free_tier_contribution_count(m.id) < 5
          )
        )
    )
  );
