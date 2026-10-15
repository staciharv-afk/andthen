-- And Then — funeral-home partner offers.
--
-- Families arrive from a partner page with ?ref=<slug>, saved on the memorial
-- as referral_source (20261013_referral_source.sql). This decides what they
-- pay, by the partner's offer:
--   A  free pilot — pages created within 90 days of activation are unlocked free
--   B  referral   — normal $49 checkout; the partner earns referral_amount per paid page
--   C  wholesale  — pages are unlocked free; we invoice the partner wholesale_price per page
-- An inactive partner (the default) does nothing beyond recording the ref,
-- because partner preview pages are public and anyone can type a ref.
--
-- Unlocking happens only here, in the database, at insert time — the browser
-- can't set is_paid / comped_by_partner itself. This also closes an older gap:
-- memorials' table-wide INSERT grant let a signed-in user create a page with
-- is_paid = true directly through the API. The UPDATE side was already locked
-- down (20260724_rls_cleanup.sql); now INSERT is too.
--
-- Idempotent. Run in Supabase → SQL Editor.

-- 1) partners ---------------------------------------------------------------

create table if not exists public.partners (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  offer_group      text not null check (offer_group in ('A', 'B', 'C')),
  active           boolean not null default false,
  activated_at     timestamptz,
  pilot_ends_at    timestamptz,
  referral_amount  numeric not null default 15,
  wholesale_price  numeric not null default 25,
  notes            text,
  created_at       timestamptz not null default now()
);

-- Service role only: RLS on with no policies, and no grants to the API roles.
alter table public.partners enable row level security;
revoke all on public.partners from anon, authenticated, public;

-- Flipping active to true stamps activated_at; offer A then gets its 90-day
-- pilot window. Set either by hand first and it's left alone.
create or replace function public.partners_set_dates()
returns trigger
language plpgsql
as $$
begin
  if new.active and new.activated_at is null then
    new.activated_at := now();
  end if;
  if new.offer_group = 'A' and new.activated_at is not null and new.pilot_ends_at is null then
    new.pilot_ends_at := new.activated_at + interval '90 days';
  end if;
  return new;
end;
$$;

drop trigger if exists partners_set_dates on public.partners;
create trigger partners_set_dates
  before insert or update on public.partners
  for each row execute function public.partners_set_dates();

-- 2) memorials: new columns -------------------------------------------------

alter table public.memorials add column if not exists comped_by_partner text;
alter table public.memorials add column if not exists paid_at timestamptz;

-- memorials has a column-scoped SELECT grant and the app uses select("*"),
-- so new columns must be granted or a steward's own pages stop loading
-- (see 20260820b_fix_memorials_select_grant.sql). Not granted to anon.
grant select (comped_by_partner, paid_at) on public.memorials to authenticated;

-- 3) unlock at creation -----------------------------------------------------

-- security definer so it can read partners, which the inserting user can't.
-- That makes current_user the function owner, so the caller's API role is
-- read from the request's verified JWT instead (auth.role(): 'anon' /
-- 'authenticated' from the app, 'service_role' from our server, null in the
-- SQL Editor).
drop function if exists public.partner_comp_slug(text);

create or replace function public.memorials_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    -- Paid state is never the browser's to set.
    new.is_paid := false;
    new.paused := false;
    new.paid_at := null;
    new.comped_by_partner := null;
    new.stripe_customer_id := null;
    new.stripe_subscription_id := null;
  end if;

  if new.referral_source is not null and new.comped_by_partner is null then
    select p.slug into new.comped_by_partner
    from public.partners p
    where p.slug = new.referral_source
      and p.active
      and (p.offer_group = 'C' or (p.offer_group = 'A' and now() < p.pilot_ends_at));
    if new.comped_by_partner is not null then
      new.is_paid := true;
    end if;
  end if;

  if new.is_paid and new.paid_at is null then
    new.paid_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.memorials_before_insert() from anon, authenticated, public;

drop trigger if exists memorials_before_insert on public.memorials;
create trigger memorials_before_insert
  before insert on public.memorials
  for each row execute function public.memorials_before_insert();

-- 4) write-once referral, and paid_at on later payment ----------------------

create or replace function public.memorials_before_update()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and (
    new.referral_source is distinct from old.referral_source
    or new.comped_by_partner is distinct from old.comped_by_partner
  ) then
    raise exception 'referral_source and comped_by_partner can''t be changed after a page is created';
  end if;

  if new.is_paid and not coalesce(old.is_paid, false) and new.paid_at is null then
    new.paid_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists memorials_before_update on public.memorials;
create trigger memorials_before_update
  before update on public.memorials
  for each row execute function public.memorials_before_update();

-- 5) "Included by {partner}" for the dashboard ------------------------------

-- Returns the comping partner's name, only to that page's own stewards.
create or replace function public.comped_partner_name(p_memorial_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.name
  from public.memorials m
  join public.partners p on p.slug = m.comped_by_partner
  where m.id = p_memorial_id
    and public.is_memorial_steward(m.id)
$$;

revoke all on function public.comped_partner_name(uuid) from anon, public;
grant execute on function public.comped_partner_name(uuid) to authenticated;

-- 6) monthly report (Supabase dashboard only) -------------------------------

-- One row per partner per month (UTC).
--   pages_created / pages_comped — by the month the page was created
--   pages_paid — Stripe-paid (checkout or gift), by the month it was paid
--   amount_owed_to_partner — offer B: paid pages × referral_amount, counting
--     only pages paid after the partner was activated
--   amount_to_invoice_partner — offer C: comped pages × wholesale_price
create or replace view public.partner_monthly_report
with (security_invoker = true) as
with events as (
  select m.referral_source as slug,
         date_trunc('month', m.created_at) as month,
         1 as created, 0 as paid, 0 as paid_while_active,
         (m.comped_by_partner is not null)::int as comped
  from public.memorials m
  where m.referral_source is not null
  union all
  select m.referral_source,
         date_trunc('month', m.paid_at),
         0, 1,
         (p.activated_at is not null and m.paid_at >= p.activated_at)::int,
         0
  from public.memorials m
  join public.partners p on p.slug = m.referral_source
  where m.is_paid and m.comped_by_partner is null and m.paid_at is not null
)
select p.slug as partner_slug,
       p.name as partner_name,
       p.offer_group,
       e.month::date as month,
       sum(e.created) as pages_created,
       sum(e.paid) as pages_paid,
       sum(e.comped) as pages_comped,
       case when p.offer_group = 'B' then sum(e.paid_while_active) * p.referral_amount else 0 end as amount_owed_to_partner,
       case when p.offer_group = 'C' then sum(e.comped) * p.wholesale_price else 0 end as amount_to_invoice_partner
from events e
join public.partners p on p.slug = e.slug
group by p.slug, p.name, p.offer_group, p.referral_amount, p.wholesale_price, e.month
order by e.month desc, p.slug;

revoke all on public.partner_monthly_report from anon, authenticated, public;

-- 7) seed -------------------------------------------------------------------

insert into public.partners (slug, name, offer_group, active)
values ('schoedinger', 'Schoedinger Funeral & Cremation Service', 'B', false)
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
