-- And Then — custom vanity URLs for memorials (myandthen.com/<slug>).
--
-- Optional, steward-chosen alternative to the invite-code URL
-- (myandthen.com/?memorial=<code>). NULL until a steward sets one; the
-- unique constraint allows any number of NULLs (Postgres treats NULLs as
-- distinct in a UNIQUE column) so this is safe to run before any memorial
-- has a slug. Run in Supabase SQL Editor. Idempotent.

alter table public.memorials add column if not exists slug text unique;

-- Defense in depth: app code normalizes to this shape before saving, but
-- enforce it at the DB layer too. NULL always passes a CHECK constraint,
-- so memorials without a slug are unaffected.
alter table public.memorials drop constraint if exists memorials_slug_format;
alter table public.memorials add constraint memorials_slug_format
  check (slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- Stewards can set/change their own memorial's slug (existing column-scoped
-- grant from 20260724_rls_cleanup.sql covers name/born/passed/etc.; this
-- just adds slug to that same allowlist — GRANT is additive, not a replace).
grant update (slug) on public.memorials to authenticated;
