-- And Then — "url" content type (pasted link, YouTube or generic).
-- One jsonb column rather than several flat ones (videoId/start/title/
-- provider) since those fields only ever exist together for a url-type
-- row and are always read/written as a unit. media_url doubles as the
-- preview thumbnail for this type, consistent with every other type.
-- Run in SQL Editor. Idempotent.

alter table public.contributions add column if not exists link_meta jsonb;

-- anon has column-scoped SELECT on this table (20260705_protect_contributor_email.sql,
-- extended for crop_x/crop_y in 20260807_contribution_photo_crop.sql);
-- INSERT/UPDATE are already table-wide, so only SELECT needs the new column added.
revoke select on public.contributions from anon;
grant select (
  id, memorial_id, contributor_name, contributor_relation,
  type, text, media_url, status, created_at, crop_x, crop_y, link_meta
) on public.contributions to anon;
