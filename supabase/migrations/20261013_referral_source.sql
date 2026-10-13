-- And Then — which partner (funeral home) page a signup came from.
--
-- Partner landing pages (public/partners/<slug>/index.html) link to
-- /?ref=<slug>; the app remembers that (src/lib/referral.js) and writes it
-- here when the visitor creates their page. Null for everyone else.
--
-- memorials has a column-scoped SELECT grant (20260820_page_privacy.sql), and
-- the app's `select("*")` / bare `.select()` calls need SELECT on every
-- column, so the new column must be granted to authenticated or a steward's
-- own pages stop loading (see 20260820b_fix_memorials_select_grant.sql).
-- Deliberately not granted to anon — it isn't part of the public page — and
-- no UPDATE grant: it's set once, at creation.
--
-- Idempotent. Run in Supabase → SQL Editor.

alter table public.memorials
  add column if not exists referral_source text;

grant select (referral_source) on public.memorials to authenticated;

notify pgrst, 'reload schema';
