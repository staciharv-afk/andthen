-- And Then — rotating prompts (T3). Up to 3 starter prompts per memorial, shown
-- rotating on the contribute form. Keeps the old single `prompt` column for
-- back-compat (the app writes both: prompts[] + prompt = prompts[0]). Run in
-- SQL Editor. Idempotent.

alter table public.memorials add column if not exists prompts text[];

-- Steward edits this, so add it to the column-scoped UPDATE grant.
grant update (prompts) on public.memorials to authenticated;

-- Backfill: seed prompts[] from any existing single prompt.
update public.memorials
set prompts = array[prompt]
where prompt is not null and prompt <> ''
  and (prompts is null or cardinality(prompts) = 0);
