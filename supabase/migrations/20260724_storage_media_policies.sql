-- And Then — fix media uploads (Fix-It #3). The `memorial-media` bucket had no
-- storage policies, so every photo/video/voice upload was denied by RLS
-- ("new row violates row-level security policy") and memories saved with a null
-- media_url. This makes the bucket public (so getPublicUrl serves files) and
-- lets anyone upload into it (contributors never sign in). Run in SQL Editor.

-- 1) Ensure the bucket exists and is public (reads served via the public URL).
insert into storage.buckets (id, name, public)
values ('memorial-media', 'memorial-media', true)
on conflict (id) do update set public = true;

-- 2) Anyone may upload into this bucket (contributors have no account).
drop policy if exists "anyone can upload memorial media" on storage.objects;
create policy "anyone can upload memorial media"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'memorial-media');

-- 3) Anyone may read this bucket's objects.
drop policy if exists "anyone can read memorial media" on storage.objects;
create policy "anyone can read memorial media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'memorial-media');
