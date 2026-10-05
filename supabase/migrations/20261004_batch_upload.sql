-- And Then — multi-photo upload: a photo's date, and "saved past the free
-- limit" memories that publish themselves when the page is paid for.
--
-- Run in Supabase → SQL Editor. Idempotent.
--
-- 1) contributions.taken_on — the day a photo was taken, read from its EXIF
--    data in the browser (editable there, never required). The uploader
--    retries without this column if it's missing, so the app works either
--    side of this migration; the date just isn't kept until it's run.
--
-- 2) A fourth contribution status, 'held'. When a creator on a free page
--    uploads more photos/videos than the free limit has room for, the app
--    publishes up to the limit and saves the rest as 'held':
--      - not on the page (get_memorial_page() and the public SELECT policy
--        only ever return 'approved'),
--      - not counted toward the free limit,
--      - only insertable by a steward, and only while the page is unpaid,
--      - flipped to 'approved' by a trigger the moment is_paid turns true —
--        whichever path sets it (Stripe webhook, pre-signup payment, gift
--        claim), so none of those need to know about held rows.
--    Until this is run, the insert of 'held' rows is rejected and the
--    uploader tells the creator the extras weren't added.

alter table public.contributions add column if not exists taken_on date;

alter table public.contributions drop constraint if exists contributions_status_check;
alter table public.contributions add constraint contributions_status_check
  check (status in ('pending', 'approved', 'rejected', 'held'));

-- Same function as 20260812_free_tier_limit.sql, now ignoring held rows —
-- "5 live memories" still means five on (or waiting to be on) the page.
create or replace function public.free_tier_contribution_count(p_memorial_id uuid)
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*) from public.contributions
  where memorial_id = p_memorial_id and status not in ('rejected', 'held');
$$;

-- Unchanged from the live definition except for the 'held' branch.
create or replace function public.can_insert_contribution(p_memorial_id uuid, p_code text, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.memorials%rowtype;
  is_steward boolean;
begin
  select * into m from public.memorials where id = p_memorial_id;
  if not found or m.closed_to_submissions then
    return false;
  end if;

  is_steward := public.is_memorial_steward(m.id);

  -- Saved past the free limit: a steward's own overflow on an unpaid page,
  -- nothing else. (On a paid page there's no limit to overflow.)
  if p_status = 'held' then
    return is_steward and not coalesce(m.is_paid, false);
  end if;

  if not (m.is_paid or (is_steward and public.free_tier_contribution_count(m.id) < 5)) then
    return false;
  end if;

  if not (
    is_steward
    or (m.visibility <> 'private' and m.contribution_access = 'open')
    or (m.access_code is not null and p_code = m.access_code)
  ) then
    return false;
  end if;

  return p_status = case when m.require_approval then 'pending' else 'approved' end;
end;
$$;

-- Publish everything that was held, the moment the page is paid for. Held
-- rows are always the creator's own uploads, which skip moderation, so they
-- go straight to 'approved'.
create or replace function public.release_held_contributions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.contributions set status = 'approved'
  where memorial_id = new.id and status = 'held';
  return new;
end;
$$;

drop trigger if exists release_held_contributions on public.memorials;
create trigger release_held_contributions
  after update of is_paid on public.memorials
  for each row
  when (new.is_paid is true and old.is_paid is distinct from true)
  execute function public.release_held_contributions();
