-- And Then — photo crop position for contribution photo entries.
-- crop_x/crop_y are percentages (0-100), applied as CSS object-position at
-- render time (e.g. "object-position: {crop_x}% {crop_y}%"). Set from
-- client-side face detection at upload time, or a manual drag-to-reposition
-- override; null means "not set" and renders as center (50/50). Reposition
-- only — no zoom/rotate, so two numbers are enough. Run in SQL Editor.
-- Idempotent.

alter table public.contributions add column if not exists crop_x real;
alter table public.contributions add column if not exists crop_y real;

-- anon has column-scoped SELECT on this table (20260705_protect_contributor_email.sql);
-- INSERT/UPDATE are already table-wide, so only SELECT needs the new columns added.
revoke select on public.contributions from anon;
grant select (
  id, memorial_id, contributor_name, contributor_relation,
  type, text, media_url, status, created_at, crop_x, crop_y
) on public.contributions to anon;
