-- And Then — keep contributor_email private (follow-up to #12).
--
-- The public memorial page reads approved contributions with the anon key,
-- which is public by design. By default anon has table-wide SELECT, so it could
-- read contributor_email too. Replace that with a column-scoped grant that omits
-- the email. RLS still controls WHICH rows anon sees; this controls WHICH
-- columns. The memorial's steward (authenticated) and the server (service_role)
-- keep full access. Run in Supabase SQL Editor. Idempotent.

revoke select on public.contributions from anon;

grant select (
  id, memorial_id, contributor_name, contributor_relation,
  type, text, media_url, status, created_at
) on public.contributions to anon;
