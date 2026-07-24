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
- [x] **Phase 2 — Export** — paid memorials get an "Export" button that
      downloads a ZIP (memories.html + media files + memories.json). Built;
      verify in browser on a paid memorial.
- [ ] **Phase 3 — Anniversary emails** (paid-gated; builds on Resend, needs a
      scheduled trigger)

### Fix-It cleanups (from the original plan)
- [x] **#3 Storage** — media uploads were failing (no bucket policies); added
      public bucket + upload/read policies. Run
      `supabase/migrations/20260724_storage_media_policies.sql`, then re-test a
      photo upload. (Old media-less memories won't backfill — re-submit those.)
- [ ] **#4 Retire the 2 leftover Vercel projects** (keep only `andthen-civ6`)
- [x] **#8 RLS audit** — found 2-3 duplicate policies per action + two weak
      INSERT policies (WITH CHECK true) that cancelled the "memorial must exist"
      guard. Cleanup in `20260724_rls_cleanup.sql` (keeps one clean policy per
      action, re-hardens is_paid). Run it, then verify flows.
- [x] **#10 Schema snapshot** — `supabase/schema.sql` committed (structure now
      in git). Legacy unused columns noted: contributions.author/photo_url/
      audio_url; the profiles table.
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
