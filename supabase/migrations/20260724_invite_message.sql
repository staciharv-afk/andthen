-- And Then — editable invite message (T1). A per-memorial message the creator
-- can customize; "Copy invite" copies it plus the invite link. Run in SQL Editor.

alter table public.memorials add column if not exists invite_message text;

-- The steward edits this, so add it to the column-scoped UPDATE grant
-- (see the paid-tier / rls-cleanup migrations that restricted UPDATE columns).
grant update (invite_message) on public.memorials to authenticated;
