# And Then…

A living memorial web app — a place to gather memories of someone who died, from
everyone who knew them. A creator sets up a memorial page, shares one link, and
friends and family add stories, photos, videos, and voice memos (no account
needed). The creator moderates what appears. Live at **myandthen.com**.

## Stack

- **Vite + React 18** — single-page app, no router library (a small custom
  history-based router lives in `src/lib/router.js`)
- **[@supabase/supabase-js](https://supabase.com/docs/reference/javascript)** —
  auth (magic link), Postgres database, and file storage
- **Vercel** — hosting (`main` branch → production)
- No TypeScript, no CSS framework. Styles are one CSS string in `src/styles.js`.

## Getting started

```bash
cp .env.example .env      # fill in the Supabase URL + anon key (see below)
npm install
npm run dev               # http://localhost:5173
```

Scripts: `npm run dev` (dev server), `npm run build` (production build),
`npm run preview` (serve the build).

### Environment

Config is read from `.env` (gitignored — never commit it):

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → Legacy `anon` / `public` key (a JWT, starts `eyJ…`) |

If these are missing the app still loads but shows a "Backend not configured"
banner and sign-in/saving are disabled.

## Project structure

```
src/
  main.jsx              React entry
  app.jsx               <App> — top-level router + session wiring
  styles.js             the single STYLES string (brand tokens, all CSS)
  lib/
    supabase.js         the supabase-js client + CONFIG_OK
    utils.js            uid, fmtDate, timeAgo, fileToDataURL
    router.js           parseLocation / routeToUrl (query-param routing)
  components/
    Toast.jsx           useToast hook + <ToastContainer>
    Nav.jsx             top nav
  pages/
    Home.jsx            marketing landing page
    Auth.jsx            magic-link sign-in
    CreateMemorial.jsx  create AND edit a memorial (one form, two modes)
    Dashboard.jsx       creator's memorials + moderation queue
    Memorial.jsx        public memorial page + contribute form
supabase/migrations/    SQL migrations (run by hand in the SQL Editor)
```

## How it works

- **Auth is magic-link only** (no passwords). The creator enters their email,
  gets a link, and supabase-js establishes the session on return.
- **Contributors never sign in.** They open `?memorial=<invite_code>` and submit.
- **Moderation:** each memorial has a `require_approval` flag. Submissions are
  `pending` until the creator approves them; Row Level Security hides pending
  memories from the public and shows them only to the memorial's steward.
- **Data model:** `memorials` (one per page, owned by `steward_id`) and
  `contributions` (memories, linked by `memorial_id`). Uploads go to the
  `memorial-media` storage bucket.

## Database changes

The schema lives in Supabase. Changes are written as SQL files in
`supabase/migrations/` and **run by hand** in the Supabase SQL Editor (the app
can't run DDL). Each migration is written to be idempotent.

## Deploying

See [DEPLOY.md](DEPLOY.md) — the short version: work on `staging`, merge to
`main`, push, and Vercel deploys `main` to production. Production reads its
Supabase config from Vercel environment variables, not from `.env`.
