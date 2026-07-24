# And Then — Dev Checklist

Living list of what's done and what's left. See [DEPLOY.md](DEPLOY.md) for the
ship process and [CLAUDE.md](CLAUDE.md) for conventions.

## ✅ Done & live in production
- Magic-link sign-in (no passwords)
- Contributions save; moderation queue (approve / remove)
- Back button / real routing (deep-links safe)
- Creator can edit a memorial (name, dates, description, photo, prompt)
- Contributor prompt (editable "And then…" starter per memorial)
- Capture contributor email (private — not exposed to the public API)
- Thank-you email on approval (Resend, from hello@myandthen.com)
- Codebase: split into per-page modules, on `@supabase/supabase-js`
- Docs: README.md + CLAUDE.md
- **Paid tier Phase 1** — $149 one-time Stripe upgrade + promo codes + feature
  gating (free = text only; paid = photo/video/voice). Verified in TEST mode.

## 🔜 Remaining

### Paid tier
- [ ] **Go live for real payments** — swap `STRIPE_SECRET_KEY` to the live key +
      add a live-mode Stripe webhook. Blocked on Staci's LLC → EIN → business bank.
- [ ] **Phase 2 — Export** ("download all memories" for a memorial; paid-gated)
- [ ] **Phase 3 — Anniversary emails** (paid-gated; builds on Resend, needs a
      scheduled trigger)

### Fix-It cleanups (from the original plan)
- [ ] **#3 Consolidate storage buckets** — confirm one bucket (`memorial-media`),
      remove any empty/duplicate
- [ ] **#4 Retire the 2 leftover Vercel projects** (keep only `andthen-civ6`)
- [ ] **#8 Audit duplicate RLS policies** — our recent policies are clean; sweep
      for old duplicates from earlier iterations
- [ ] **#10 Snapshot the DB schema into the repo** (a full `schema.sql` so the
      structure lives in git, not only on Supabase)
- [ ] **#14 Handoff walkthrough** — short Loom + let Staci try DIY fixes

### Housekeeping
- [ ] Clear test data before real families use it (test memorials, the
      "DELETE ME" probe memory, reset test-upgraded memorials if desired)
- [ ] Rotate the Resend API key (was shared in chat during setup)
- [ ] Fix Supabase Auth Site URL to include `https://` (prod magic-links)

## 💡 Nice-to-have / future (from Staci's roadmap)
- Family tree, multiple pages/tabs (paid)
- Forgot-nothing UX polish from Staci's real-user notes (collect at handoff)
- New front-end design Staci mentioned (drops onto the clean module structure)
