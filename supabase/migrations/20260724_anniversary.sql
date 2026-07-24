-- And Then — anniversary emails (paid tier Phase 3). Tracks the last date we
-- sent a memorial's anniversary email, so the daily cron never double-sends.
-- Set only by the server (service_role). Run in SQL Editor.

alter table public.memorials add column if not exists anniversary_notified_on date;
