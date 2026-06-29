# CLAUDE.md

Guidance for Claude Code working in this repo. Read this first; it captures the
conventions and the non-obvious gotchas so you don't rediscover them each time.

## What this is

"And Then…" — a memorial app (Vite + React 18 + Supabase, hosted on Vercel at
myandthen.com). See [README.md](README.md) for the overview and
[DEPLOY.md](DEPLOY.md) for the deploy flow. The creator/client is Staci; the
goal is for her to keep building with Claude, so leave the codebase clean and
documented.

## Architecture map

One page per file. Don't put everything back in `app.jsx`.

- `src/app.jsx` — `<App>`: routing + auth/session wiring only.
- `src/lib/supabase.js` — the `supabase` client (null if unconfigured; guard with
  `CONFIG_OK`). Import it; never construct another client (multiple GoTrue
  instances warn and misbehave).
- `src/lib/utils.js` — `uid`, `fmtDate`, `timeAgo`, `fileToDataURL`. Import these;
  don't redefine.
- `src/lib/router.js` — `APP_VIEWS`, `parseLocation`, `routeToUrl`.
- `src/styles.js` — the single `STYLES` string. All CSS + brand tokens live here.
- `src/components/` — `Toast` (`useToast` + `ToastContainer`), `Nav`.
- `src/pages/` — `Home`, `Auth`, `CreateMemorial` (create + edit), `Dashboard`,
  `Memorial`.

## Conventions

- **Styling:** reuse the existing CSS classes from `styles.js` and the CSS
  variables (`--rust`, `--bark`, `--cream`, etc.). Match the existing look; don't
  introduce a CSS framework or inline a new design system.
- **Data access:** use the supabase-js chained API
  (`supabase.from(t).select().eq().order()`, `.insert().select()`,
  `.update({...}).eq("id", id)`, `supabase.storage.from("memorial-media")`).
- **Auth is magic-link only.** Do not add password fields or other providers.
  `currentUser` is the supabase user object — `currentUser.id` equals
  `auth.uid()` equals a memorial's `steward_id`.
- **Routing:** to add a view, add it to `APP_VIEWS` in `router.js`, handle it in
  `app.jsx`, and use `navigate(page, param)` (it does `pushState`, so Back works).
  Contributor deep-links are `?memorial=<code>`; app views are `?view=<name>`.
- **Copy is the product, not a placeholder.** The brand voice is plain, specific,
  present-tense, never grief-coded. Don't rewrite user-facing copy casually.

## Database / RLS

- Schema changes = a new idempotent SQL file in `supabase/migrations/`, **run by
  hand in the Supabase SQL Editor**. The app (anon/auth key) cannot run DDL.
- RLS is the real security boundary (the anon key is public by design). Current
  rules: anyone may read `approved` contributions and any memorial; anyone may
  insert a contribution to an existing memorial; only a memorial's steward can
  read its pending memories, moderate them, or edit/delete the memorial.
- If a save mysteriously does nothing, suspect a missing RLS policy before code.

## Verifying changes

- `npm run build` catches syntax/import-resolution errors — but NOT undefined
  globals (e.g. a helper used without importing it builds fine, then throws at
  runtime).
- So always run the dev server and exercise the actual flow, **including a
  toast-triggering action** (any save / sign-in fires a toast). Read-only checks
  miss a whole class of bugs — this is exactly how a missing `uid` import in
  `Toast.jsx` slipped past a build + read-path check once.
- Use the preview tooling to drive the browser and check the console.

## Gotchas

- **Case-insensitive macOS filesystem:** `App.jsx` and `app.jsx` are the same
  file. The entry is lowercase `app.jsx` (what `main.jsx` imports and git tracks).
- **Two key formats:** the project is on Supabase's new key system
  (`sb_publishable_…`/`sb_secret_…`) but the app uses the **legacy `anon` JWT**.
  Migrating to publishable keys is a future task; until then use the legacy anon
  key in `.env` / Vercel.
- **Supabase is on the Pro plan** — don't downgrade; the free tier auto-pauses
  after ~7 days idle and takes the whole site down.
- **Don't commit `.env`** (it's gitignored) and **don't push** without being
  asked — pushing `main` deploys to production. Production config lives in Vercel
  env vars, not in the pushed code.

## Roadmap (from the Fix-It plan)

Done: magic-link sign-in, contribution saving, back-button routing, env config,
creator edit, `@supabase/supabase-js` swap, per-page module split.
Remaining: consolidate storage buckets, retire extra Vercel projects, audit
duplicate RLS policies, snapshot the schema into the repo, contributor prompt
field, capture contributor email, Resend thank-you email.
