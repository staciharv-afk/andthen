-- And Then — a second, optional media file on a contribution. Introduced
-- for the Share modal's "Record it in your own voice" mode: the recording
-- is the primary media (media_url/type as usual, type='voice'), and this
-- column holds an optional photo attached alongside it ("Add a photo too").
-- Not a general-purpose multi-media field — every other entry type still
-- has exactly one media file, in media_url. Run in SQL Editor. Idempotent.

alter table public.contributions add column if not exists secondary_media_url text;

-- anon has column-scoped SELECT on this table (20260705_protect_contributor_email.sql,
-- extended for crop_x/crop_y in 20260807_contribution_photo_crop.sql and link_meta in
-- 20260807_contribution_link_meta.sql); INSERT/UPDATE are already table-wide, so only
-- SELECT needs the new column added.
revoke select on public.contributions from anon;
grant select (
  id, memorial_id, contributor_name, contributor_relation,
  type, text, media_url, status, created_at, crop_x, crop_y, link_meta, secondary_media_url
) on public.contributions to anon;
