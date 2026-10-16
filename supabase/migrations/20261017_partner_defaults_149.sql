-- And Then — partner payout defaults follow the $149 price.
--
-- The build fee went from $49 to $149. 20261016_partner_offers.sql set the
-- partner defaults against $49 (referral 15, wholesale 25); this moves them
-- to referral_amount 74.50 (half of $149) and wholesale_price 75.
--
-- Existing rows are updated only where they still hold the old defaults, so
-- a rate negotiated by hand for a specific partner isn't overwritten.
-- Idempotent: safe to run more than once. Run by hand in the SQL Editor.

alter table public.partners alter column referral_amount set default 74.50;
alter table public.partners alter column wholesale_price set default 75;

update public.partners set referral_amount = 74.50 where referral_amount = 15;
update public.partners set wholesale_price = 75    where wholesale_price = 25;

notify pgrst, 'reload schema';
