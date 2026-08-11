-- And Then — a second-level classification within a contribution's primary
-- type, needed for the memory reader's content-type filters:
--   type='voice'  + subtype='recording' -> "Spoken story" (recorded via the
--     Share modal's Record toggle/quick-attach)
--   type='voice'  + subtype='upload'    -> "Voicemail" (an uploaded existing
--     audio file)
--   type='photo'  + subtype='recipe'    -> "Recipe" (contributor marked an
--     attached photo as a recipe at share time)
-- subtype is null for every other type, and for pre-migration voice/photo
-- rows that predate this distinction (untagged voice rows are treated as
-- voicemails by default — see Memorial.jsx's contentTypeLabel/matchesFilter).
-- Run in SQL Editor. Idempotent.

alter table public.contributions add column if not exists subtype text;

-- anon has column-scoped SELECT on this table (20260705_protect_contributor_email.sql,
-- extended for crop_x/crop_y, link_meta, secondary_media_url in later migrations);
-- INSERT/UPDATE are already table-wide, so only SELECT needs the new column added.
revoke select on public.contributions from anon;
grant select (
  id, memorial_id, contributor_name, contributor_relation,
  type, subtype, text, media_url, status, created_at, crop_x, crop_y, link_meta, secondary_media_url
) on public.contributions to anon;
