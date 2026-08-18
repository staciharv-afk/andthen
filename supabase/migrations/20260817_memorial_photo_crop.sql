-- And Then — crop/reposition position for a memorial's header photo.
--
-- Same idiom as contributions.crop_x/crop_y (20260807_contribution_photo_crop.sql):
-- percentages (0-100), applied as CSS object-position at render time
-- ("object-position: {crop_x}% {crop_y}%"). Null means "not set" and
-- renders as center (50/50) — every existing page keeps rendering exactly
-- as it does today, no backfill needed. Set from client-side face
-- detection at upload time, or a manual drag-to-reposition override.
--
-- Unlike contributions, memorials has never had column-scoped SELECT (see
-- 20260809_memorial_subscription_fields.sql), so no SELECT grant change is
-- needed — the public page picks up the new columns automatically. Only
-- the steward-facing UPDATE needs a grant, same pattern as every other
-- per-field memorials grant (slug, prompts, access_mode, etc.).
--
-- Run in Supabase → SQL Editor. Idempotent.

alter table public.memorials add column if not exists crop_x real;
alter table public.memorials add column if not exists crop_y real;

grant update (crop_x, crop_y) on public.memorials to authenticated;
