-- And Then — "Buy as a gift" checkout option.
--
-- gift_purchases records a $49 build fee paid by someone (the gifter) on
-- behalf of someone else (the recipient), who hasn't signed up yet and may
-- not even know it's coming until the claim email arrives.
--
-- Fully locked down — no grant to anon or authenticated at all, unlike every
-- other table in this schema. There is no page here that should ever list a
-- visitor's own gifts, and the claim page's visitor has no Supabase session
-- to scope a normal RLS policy to anyway (they haven't signed up yet). The
-- Stripe session id is the only credential a recipient (or gifter) ever has,
-- so every read/write goes through a Vercel serverless function using the
-- service_role key, which checks that id itself before touching a row —
-- same "narrow, secret-gated server function" shape as get_memorial_page()
-- uses for private memorials, just done in the API layer instead of SQL
-- since this only ever needs point lookups by session id, not the kind of
-- listing/ownership logic RLS is for.
--
-- Idempotent. Run in Supabase → SQL Editor.

create table if not exists public.gift_purchases (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  gifter_email text,
  gifter_name text,
  recipient_email text not null,
  recipient_name text not null,
  gift_message text,
  status text not null default 'sent' check (status in ('sent', 'claimed', 'declined')),
  memorial_id uuid references public.memorials(id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists gift_purchases_memorial_id_idx on public.gift_purchases(memorial_id);

alter table public.gift_purchases enable row level security;
revoke all on public.gift_purchases from anon, authenticated, public;
-- No policies created — service_role (used only by api/*.js server
-- functions) bypasses RLS entirely, which is the only way in by design.
