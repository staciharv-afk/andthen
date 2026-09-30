-- And Then — the redesigned dashboard's "Add a co-steward" sheet collects a
-- name alongside the email, so an invited-but-not-yet-accepted steward can
-- be listed as "Invite sent to Jane" instead of just their raw address.
-- Purely cosmetic (never used for matching/auth — invited_email + the
-- signed-in JWT's email still does that) so a plain nullable column is all
-- this needs.
--
-- Idempotent. Run in Supabase → SQL Editor.

alter table public.memorial_stewards
  add column if not exists invited_name text;

grant update (invited_name) on public.memorial_stewards to authenticated;
-- Covers the insert path too (inviteSteward() sets it at creation time).
grant insert (invited_name) on public.memorial_stewards to authenticated;
