# Partner pages

Co-branded landing pages for funeral homes. Each one is a single plain HTML
file — not part of the React app — served straight from this folder:

    public/partners/<slug>/index.html  →  https://www.myandthen.com/partners/<slug>

`<slug>` is lowercase letters, numbers and hyphens (e.g. `schoedinger`).

## Adding a funeral home

1. Copy an existing folder (e.g. `schoedinger/`) to `public/partners/<slug>/`
   and edit `index.html`.
2. Point every "Start their page" link at the right URL for the funeral
   home's offer (its row in the `partners` table, see
   `supabase/migrations/20261016_partner_offers.sql`):
   - **Offer B** (families pay $149):
     `https://www.myandthen.com/?view=pricing&checkout=1&ref=<slug>`.
     `checkout=1` opens the $149 checkout straight away. Write each `&` as
     `&amp;` in the HTML.
   - **Offers A and C** (free to the family):
     `https://www.myandthen.com/?view=onboarding&ref=<slug>`. Never link these
     to checkout, or families pay for a page that's already free.

   For A and C, make the slug hard to guess (e.g. `egan-ryan-k7q3`). Once
   the partner is active, anyone who uses that ref gets a free page, and
   under C we invoice the funeral home for it.

   `ref` is what ties a signup
   back to the funeral home: the app remembers it (`src/lib/referral.js`) and
   saves it as `referral_source` on the memorial the family creates.
3. Keep `<meta name="robots" content="noindex, nofollow">` in the `<head>`.
   `public/robots.txt` already disallows all of `/partners/`.
4. Until the funeral home has agreed to partner, the footer reads "A preview
   prepared by And Then for <name>…". Swap it to the "<name> offers And Then to
   the families it serves…" line once they sign.

Nothing else needs to change — no route, no `vercel.json` entry. Vercel serves
files in `public/` before the app's catch-all rewrite.

## Turning a partner on

Partners stay inactive until they sign; an inactive partner only records
`referral_source`. In Supabase → Table Editor → `partners`, set `active` to
true. That stamps `activated_at`, and for offer A sets `pilot_ends_at` to 90
days later. Pages comped during a pilot stay unlocked after it ends.

## Seeing results

Supabase → SQL Editor:

    select * from partner_monthly_report;

Visits to the partner pages themselves aren't tracked yet: the site uses
Google Analytics inside the React app only, and Vercel Web Analytics isn't
installed.
