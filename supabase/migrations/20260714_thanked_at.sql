-- And Then — thank-you email dedupe (Fix-It #13).
-- Records when a contributor was emailed a thank-you, so we never send twice.
-- Written by the server (service_role) only. Run in Supabase SQL Editor.

alter table public.contributions add column if not exists thanked_at timestamptz;
