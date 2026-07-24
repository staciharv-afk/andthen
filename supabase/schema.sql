-- And Then — public schema snapshot (reference + restore aid).
-- Captured 2026-07-24 from the live database (information_schema).
--
-- This documents table structure. Row Level Security policies, column grants,
-- and storage config live in the migration files in this folder — the current
-- canonical policy set is after 20260724_rls_cleanup.sql. Foreign keys and
-- cascade behavior below are best-effort (inferred from app usage); verify
-- against the live DB before relying on this for a full restore.

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ── memorials — one per memorial page, owned by a steward (auth user) ──
create table if not exists public.memorials (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  born             date,
  passed           date,
  description      text,
  photo_url        text,
  steward_id       uuid references auth.users (id),
  invite_code      text default encode(gen_random_bytes(8), 'hex'),
  created_at       timestamptz default now(),
  require_approval boolean default true,
  prompt           text,                    -- editable contributor starter prompt
  is_paid          boolean not null default false  -- set only by the Stripe webhook (service_role)
);

-- ── contributions — memories submitted to a memorial ──
create table if not exists public.contributions (
  id                   uuid primary key default uuid_generate_v4(),
  memorial_id          uuid not null references public.memorials (id) on delete cascade,
  contributor_name     text,
  contributor_relation text,
  contributor_email    text,               -- private: not granted to anon (see migrations)
  type                 text not null default 'story',  -- story | photo | video | voice
  text                 text,
  media_url            text,
  status               text not null default 'pending', -- pending | approved | rejected
  thanked_at           timestamptz,        -- set when the thank-you email is sent
  created_at           timestamptz default now(),
  -- legacy columns from the original schema, unused by the app (kept nullable):
  author               text,
  photo_url            text,
  audio_url            text
);

-- ── profiles — legacy; not used by the current app (auth uses auth.users directly) ──
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id),
  email      text not null,
  name       text,
  created_at timestamptz default now()
);

-- Storage: bucket "memorial-media" (public) holds contribution + cover media.
-- Its policies are defined in 20260724_storage_media_policies.sql.
