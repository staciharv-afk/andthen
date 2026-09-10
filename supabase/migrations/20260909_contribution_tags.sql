-- And Then — descriptive tags on a contribution, independent of its `type`.
--
-- `type` stays exactly as it was: exactly one per entry, auto-derived from
-- what was uploaded (photo/video/voice/url/story). `tags` is a separate,
-- additive fact about what the content *is* — zero or more labels from a
-- small fixed taxonomy (currently just 'Recipe'; more get added the same
-- way). A single entry can be type='photo' with tags='{Recipe}'.
--
-- This retires the old `subtype='recipe'` overload on photos: that value
-- was really a tag, not a second-level format. `subtype` now means only
-- what it means for voice rows ('recording' vs 'upload'). Voice subtype is
-- left untouched.
--
-- Run in the Supabase SQL Editor. Idempotent.

alter table public.contributions add column if not exists tags text[] not null default '{}';

-- Backfill: every photo previously flagged as a recipe becomes tags='{Recipe}',
-- then clear the now-redundant subtype so it's voice-only going forward.
update public.contributions
  set tags = array['Recipe']
  where subtype = 'recipe' and not (tags @> array['Recipe']);
update public.contributions
  set subtype = null
  where type = 'photo' and subtype = 'recipe';

-- anon has column-scoped SELECT (see 20260811_contribution_subtype.sql and
-- the crop/link/secondary-media migrations before it); INSERT and the
-- steward UPDATE policy are table-wide, so only SELECT needs `tags` added.
revoke select on public.contributions from anon;
grant select (
  id, memorial_id, contributor_name, contributor_relation,
  type, subtype, tags, text, media_url, status, created_at,
  crop_x, crop_y, link_meta, secondary_media_url
) on public.contributions to anon;
