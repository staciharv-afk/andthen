# Partner pages

Co-branded landing pages for funeral homes. Each one is a single plain HTML
file — not part of the React app — served straight from this folder:

    public/partners/<slug>/index.html  →  https://www.myandthen.com/partners/<slug>

`<slug>` is lowercase letters, numbers and hyphens (e.g. `schoedinger`).

## Adding a funeral home

1. Copy an existing folder (e.g. `schoedinger/`) to `public/partners/<slug>/`
   and edit `index.html`.
2. Point every "Start their page" link at
   `https://www.myandthen.com/?view=pricing&checkout=1&ref=<slug>` (write the
   `&` as `&amp;` in the HTML). `checkout=1` opens the $49 checkout straight
   away. `ref` is what ties a signup
   back to the funeral home: the app remembers it (`src/lib/referral.js`) and
   saves it as `referral_source` on the memorial the family creates.
3. Keep `<meta name="robots" content="noindex, nofollow">` in the `<head>`.
   `public/robots.txt` already disallows all of `/partners/`.
4. Until the funeral home has agreed to partner, the footer reads "A preview
   prepared by And Then for <name>…". Swap it to the "<name> offers And Then to
   the families it serves…" line once they sign.

Nothing else needs to change — no route, no `vercel.json` entry. Vercel serves
files in `public/` before the app's catch-all rewrite.

## Seeing results

    select referral_source, count(*) from memorials
    where referral_source is not null group by 1;

Visits to the partner pages themselves aren't tracked yet: the site uses
Google Analytics inside the React app only, and Vercel Web Analytics isn't
installed.
