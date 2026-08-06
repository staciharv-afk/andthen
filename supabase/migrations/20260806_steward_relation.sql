-- And Then — steward's relationship to the person the memorial is for,
-- captured on the onboarding intro step ("Your relationship to them").
-- Optional context set by whoever creates the page; not currently rendered
-- publicly. Run in SQL Editor. Idempotent.

alter table public.memorials add column if not exists steward_relation text;

-- Steward edits this like any other content field.
grant update (steward_relation) on public.memorials to authenticated;
