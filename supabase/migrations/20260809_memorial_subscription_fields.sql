-- And Then — pre-signup checkout for the "Pay as you go" ($49 + $10/yr) and
-- "Pay once" ($100 forever) pricing tiers. A memorial is created (via the
-- normal magic-link onboarding flow) *after* payment, so the resulting
-- memorial needs a place to record the Stripe customer/subscription it was
-- attached to — used both to unlock is_paid (api/attach-presignup-payment.js)
-- and later to know which page to pause if the $10/yr renewal fails
-- (api/stripe-webhook.js's customer.subscription.updated handler).
-- Run in SQL Editor. Idempotent.

alter table public.memorials add column if not exists stripe_customer_id text;
alter table public.memorials add column if not exists stripe_subscription_id text;
alter table public.memorials add column if not exists paused boolean not null default false;

-- Looked up by subscription id when a renewal webhook fires.
create index if not exists memorials_stripe_subscription_id_idx
  on public.memorials (stripe_subscription_id) where stripe_subscription_id is not null;

-- Unlike contributions, memorials has never had column-scoped SELECT —
-- select("*") already works for anon (that's how a visitor loads someone
-- else's page), so all three new columns are readable the same way with
-- no grant change needed. All three are only ever written server-side
-- (service_role, via api/attach-presignup-payment.js and
-- api/stripe-webhook.js) — never by the anon/authenticated INSERT/UPDATE
-- paths a browser uses directly.
