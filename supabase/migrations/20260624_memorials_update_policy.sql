-- And Then — let a memorial's steward edit (and delete) their own memorial.
--
-- Context: the app could create + read memorials but had no UPDATE policy, so
-- the new creator "Edit memorial" feature would silently fail under RLS.
-- Run in Supabase → SQL Editor. Idempotent.

alter table public.memorials enable row level security;

drop policy if exists "stewards update their memorial" on public.memorials;
create policy "stewards update their memorial"
  on public.memorials for update
  to authenticated
  using (steward_id = auth.uid())
  with check (steward_id = auth.uid());

drop policy if exists "stewards delete their memorial" on public.memorials;
create policy "stewards delete their memorial"
  on public.memorials for delete
  to authenticated
  using (steward_id = auth.uid());
