# Dev Checklist — And Then

A task queue for a Claude Code session working in this repo. Pick a task from
**Ready now**, follow its spec, and check it off. Read [CLAUDE.md](CLAUDE.md)
first — it has the architecture map and conventions this file assumes. See
[DEPLOY.md](DEPLOY.md) for the ship flow.

## How to work here (read before starting)

- **Stack:** Vite + React 18 + `@supabase/supabase-js`. One page per file in
  `src/pages/`; shared bits in `src/lib/`; all CSS in `src/styles.js` (reuse the
  existing classes + CSS variables — don't add a framework).
- **Auth is magic-link only.** Never add passwords/providers. `currentUser` is
  the supabase user; `currentUser.id` = `auth.uid()` = a memorial's `steward_id`.
- **Data:** supabase-js chained API. The client is `src/lib/supabase.js`
  (`supabase`, `CONFIG_OK`); import it, don't make another.
- **DB changes:** add an **idempotent** SQL file to `supabase/migrations/`. You
  **cannot run DDL** — after writing it, tell the human to run it in the Supabase
  SQL Editor. RLS is the real security boundary; check policies when a
  write/read misbehaves. (Gotcha: don't `insert().select()` a row the caller
  can't read back under RLS — it rejects the whole insert.)
- **Verify every change:** `npm run build` AND run the dev server and exercise
  the real flow **including a toast-triggering action** (a build passes even when
  a helper is used without importing it — that only throws at runtime).
- **Git:** work on `staging`. Commit when done; **do not push** (pushing `main`
  deploys to production). Promotion is `staging` → `main` by the human.
- **Never commit `.env`.** Secrets (Resend, Stripe, service_role) live in Vercel
  env vars, not in code. `api/*` are Vercel serverless functions — they don't
  run under `npm run dev`; test them on a Vercel deploy.
- Legend: **[quick]** ~<1hr · **[medium]** a few hrs · **[package]** its own
  scoped project. 👤 = needs a human (access/decision) · 🔧 = code.

---

## ✅ Done & live
- Magic-link sign-in; contribution saving; back-button routing (the 3 doors)
- Codebase split into per-page modules; on `@supabase/supabase-js`
- README + CLAUDE.md + DEPLOY.md
- Creator can **edit** a memorial (name/dates/description/photo/prompt)
- **#11** contributor prompt · **#12** contributor email (kept private)
- **#13** thank-you email (Resend, live from hello@myandthen.com)
- **#3** storage fixed — media uploads (photo/video/voice + cover) now work
- **#8** RLS cleanup — dropped duplicate policies, closed the weak-insert gap,
  re-hardened `is_paid` · **#10** `supabase/schema.sql` snapshot in git
- **Paid tier Phase 1** — $149 one-time Stripe upgrade + promo codes + gating
  (verified in Stripe TEST mode) · **Phase 2** export (download memorial as ZIP)

## 🟢 Ready now (no external blockers)

### ✅ T1 · Editable invite message — DONE (run 20260724_invite_message.sql; verify save + "Copy invite")
Creator sets an invite message that copies with the link.
- **DB:** `alter table public.memorials add column if not exists invite_message text;`
- **Files:** `CreateMemorial.jsx` (textarea, save on create + edit — same pattern
  as `prompt`), `Dashboard.jsx` ("Copy invite" button that copies message + URL).
- **Default** when null: `I'm gathering memories of {name}. Would you share one? {link}`

### ✅ T2 · 60-second cap on voice & video — DONE
- **Files:** `Memorial.jsx`. Voice: auto-`stopRecording()` at 60s. Video: on file
  select, read duration via a temp `<video>` + `URL.createObjectURL`; reject >60s
  with a toast and clear the file.

### ✅ T3 · Rotating prompts (2–3) — DONE (run 20260724_rotating_prompts.sql)
Supersedes the single `prompt` field (#11).
- **DB:** `alter table public.memorials add column if not exists prompts text[];`
  (migrate existing `prompt` into `prompts[0]` when empty).
- **Files:** `CreateMemorial.jsx` (up to 3 inputs), `Memorial.jsx` (rotate through
  non-empty prompts; fall back to `prompt`, then `And then {firstName}…`).

### ✅ T4 · Creator notification email (per contribution, cap 5/day) — DONE (run 20260724_notified_at.sql; verify after deploy)
Resend is now live, so this is unblocked.
- **New file:** `api/notify-creator.js` (mirror `api/thank-you.js`). service_role:
  contribution → memorial → `steward_id`; steward email via
  `admin.auth.admin.getUserById`; count today's contributions; if ≤5, email
  "New memory on {name}'s page from {contributor}" linking to the dashboard.
- **Wire:** fire-and-forget from `Memorial.handleSubmit` (all submissions) via a
  `notifyCreator(id)` helper in `src/lib/utils.js` (mirror `sendThankYou`).

### ✅ T5 · "Forward" CTA in the thank-you email — DONE (verify after deploy)
- **Files:** `api/thank-you.js` — also select `memorials(invite_code)`, append:
  `Know someone else who knew {name}? Send them this link: https://www.myandthen.com/?memorial={invite_code}`

### ✅ Paid tier Phase 3 · Anniversary emails — DONE
Daily Vercel Cron (`api/anniversary-cron`, scheduled in vercel.json) emails the
**steward** on a memorial's birth/passing anniversary. Paid-only (`is_paid`),
deduped via `anniversary_notified_on`. Activate: run
`20260724_anniversary.sql`, add `CRON_SECRET` in Vercel, deploy.

---

## ⚠️ Blocked on Staci's decision (don't build until decided)
- **D1 · Moderation default** 👤 — Figma contradicts itself. Current: pre-
  moderation default + a toggle. If Staci wants post-moderation, flip default
  `requireApproval` to `false` in `CreateMemorial.jsx` + adjust contributor copy.
- **D2 · PDF export** 👤 — ZIP export (Phase 2) is done. If she specifically
  wants a PDF variant, scope it separately.

## 🔒 Blocked on human setup
- **Paid tier go-live** 👤 — swap `STRIPE_SECRET_KEY` to the live key + add a
  live-mode Stripe webhook once Staci's LLC → EIN → business bank are ready.

## 🧹 Housekeeping
- **#4 Retire Vercel projects — [quick]** 👤 keep `andthen-civ6`, delete the other two
- 👤 Supabase **Site URL** → add `https://` (`https://www.myandthen.com`)
- 👤 **Rotate the Resend API key** (shared in chat during setup)
- 👤 Clear test data (test memorials, "DELETE ME" probe memories, reset any
  test-upgraded memorials) before real families use it
- 🔧 (optional) drop legacy unused columns `contributions.author/photo_url/audio_url`;
  the `profiles` table is unused

## 📦 Handoff
- **#14** ✅ written guide done — `GUIDE.md` (how it works, journeys, data,
  services, and how to vibe-code changes safely) + README/CLAUDE/DEPLOY.
  Remaining: 👤 record the short Loom-style walkthrough video.

## 🔭 Future / separate packages (out of current scope)
Returning-visitor recognition (cookie / email-match / invite-token prefill) ·
pre-roll welcome video · themes/layouts/custom URL · timeline/family tree ·
multiple pages/tabs · "draft a eulogy with AI" · video slideshow · printable
program · pass-to-next-of-kin · Google/Apple sign-in · new front-end design.
