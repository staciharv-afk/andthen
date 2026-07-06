-- And Then — journey features (Fix-It #11, #12).
--   #11: an editable per-memorial "starter prompt" shown on the contribute form.
--   #12: capture the contributor's email (optional) so we can thank them later.
-- Both are plain nullable text columns; no RLS change needed (the existing
-- insert/select policies already cover new columns). Run in Supabase SQL Editor.

alter table public.memorials     add column if not exists prompt            text;
alter table public.contributions add column if not exists contributor_email text;
