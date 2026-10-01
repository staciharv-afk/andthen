-- And Then — optional co-stewards suggested at gift-purchase time.
--
-- A gift is bought before any memorial exists (the recipient creates it
-- themselves at claim time — see api/claim-gift.js), so a suggested
-- co-steward can't be a memorial_stewards row yet (that table requires a
-- real memorial_id). These rows are staging: captured at purchase, linked
-- to the real memorial once claimed, and only turned into actual
-- memorial_stewards invites (with real emails sent) when the recipient
-- reviews and confirms — never before, and never without the recipient's
-- own action. See api/send-gift-costeward-invites.js.
--
-- Idempotent. Run in Supabase → SQL Editor.

alter table public.gift_purchases
  add column if not exists subject_name text,
  add column if not exists gifter_wants_costeward boolean not null default false;

create table if not exists public.gift_suggested_costewards (
  id uuid primary key default gen_random_uuid(),
  gift_purchase_id uuid not null references public.gift_purchases(id) on delete cascade,
  name text not null,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'declined')),
  -- Null until the recipient claims the gift and a real memorial exists
  -- (api/claim-gift.js sets this) — is_memorial_steward(null) is always
  -- false, so a pre-claim row is simply invisible to anyone under RLS.
  memorial_id uuid references public.memorials(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists gift_suggested_costewards_memorial_idx
  on public.gift_suggested_costewards (memorial_id) where memorial_id is not null;

alter table public.gift_suggested_costewards enable row level security;
revoke all on public.gift_suggested_costewards from anon, authenticated, public;

-- Read-only for the memorial's own stewards (dashboard's "Waiting on you" /
-- the review screen) — every write (linking at claim, creating the real
-- invites, marking sent/declined) happens server-side with the service
-- role, same posture as gift_purchases itself, so there's no insert/update/
-- delete policy here at all.
create policy "stewards see their gift co-steward suggestions"
  on public.gift_suggested_costewards for select
  to authenticated
  using (public.is_memorial_steward(memorial_id));
grant select on public.gift_suggested_costewards to authenticated;
