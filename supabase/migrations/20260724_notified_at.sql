-- And Then — creator notifications (T4). Tracks which contributions the creator
-- has already been notified about, so we email once per memory and can enforce a
-- daily cap. Set only by the server (service_role). Run in SQL Editor.

alter table public.contributions add column if not exists notified_at timestamptz;
