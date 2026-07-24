-- And Then — RLS cleanup (Fix-It #8). Policies accumulated across iterations,
-- leaving 2-3 duplicates per action plus two weak INSERT policies on
-- contributions (WITH CHECK true) that cancelled out the "memorial must exist"
-- guard. This drops the redundant/old policies, keeping ONE clean policy per
-- (table, command), and re-hardens the is_paid protection. Run in SQL Editor.
--
-- Safe: the kept policies preserve current behavior — public reads approved
-- memories + any memorial; anyone contributes to a real memorial; stewards
-- manage their own memorial + its memories.

-- ── contributions ─────────────────────────────────────────────
-- Drop the old/duplicate policies (keep the "…their memories" / "…real memorial" set).
drop policy if exists "Anyone can submit"                     on public.contributions;
drop policy if exists "Anyone can submit contributions"       on public.contributions;
drop policy if exists "Approved contributions are public"     on public.contributions;
drop policy if exists "Public reads approved"                 on public.contributions;
drop policy if exists "Stewards read all"                     on public.contributions;
drop policy if exists "Stewards can moderate contributions"   on public.contributions;
drop policy if exists "Stewards update"                       on public.contributions;
drop policy if exists "Stewards can delete contributions"     on public.contributions;
drop policy if exists "Stewards delete"                       on public.contributions;
-- Kept: "anyone can contribute to a real memorial" (INSERT),
--       "approved memories are public" (SELECT), "stewards see their memories" (SELECT),
--       "stewards moderate their memories" (UPDATE), "stewards delete their memories" (DELETE).

-- ── memorials ─────────────────────────────────────────────────
drop policy if exists "Auth users can create memorials"   on public.memorials;
drop policy if exists "Memorials are publicly viewable"   on public.memorials;
drop policy if exists "Stewards can update memorials"     on public.memorials;
drop policy if exists "Stewards can update own memorials"  on public.memorials;
drop policy if exists "Stewards can delete own memorials"  on public.memorials;
-- Kept: "Public can read memorials" (SELECT), "Users can create memorials" (INSERT),
--       "stewards update their memorial" (UPDATE), "stewards delete their memorial" (DELETE).

-- ── re-harden is_paid ─────────────────────────────────────────
-- Ensure NOBODY but the server (service_role) can set is_paid, even if an older
-- grant to PUBLIC/anon lingered. Only the steward's content columns are updatable.
revoke update on public.memorials from anon, authenticated, public;
grant update (name, born, passed, description, prompt, photo_url, require_approval)
  on public.memorials to authenticated;
