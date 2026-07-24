-- And Then — paid tier: a per-memorial "is_paid" flag ($149 one-time unlocks
-- photo/video/audio contributions, and later exports + anniversary emails).
--
-- Critically, is_paid is set ONLY by the server (the Stripe webhook, via the
-- service_role key) — never by the client. We replace the steward's table-wide
-- UPDATE grant with a column-scoped one that omits is_paid, so a signed-in
-- creator can still edit their memorial's content but can't flip themselves to
-- paid for free. Run in Supabase SQL Editor. Idempotent.

alter table public.memorials add column if not exists is_paid boolean not null default false;

-- Column-scoped UPDATE for the steward: everything the edit form touches, but
-- NOT is_paid (nor id/steward_id/invite_code/created_at). RLS still limits this
-- to the steward's own rows; this limits which columns they can change.
revoke update on public.memorials from authenticated;
grant update (name, born, passed, description, prompt, photo_url, require_approval)
  on public.memorials to authenticated;
