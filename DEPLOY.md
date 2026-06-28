# Deploying And Then

How code gets from your laptop to the live site at **myandthen.com**.

## The model (read this once)

**Branches are not environments.** `main` and `staging` are just two lines of
history in the same repo. What's "production" is decided by **Vercel**, not the
branch name:

- **`main`** = Vercel's Production Branch → deploys to **myandthen.com** (live).
- **`staging`** = a safety net → deploys to a temporary **Preview URL** (not live).

Work reaches real users only when it's on `main` **and pushed to GitHub**.

## Normal workflow

```bash
# 1. Work on staging
git checkout staging
# ...make changes, test locally with `npm run dev` (http://localhost:5173)...
git add -A
git commit -m "Describe the change"
git push origin staging          # → Vercel builds a Preview URL to eyeball

# 2. When it looks good, promote to production
git checkout main
git merge staging --ff-only
git push origin main             # → Vercel auto-deploys to myandthen.com
git checkout staging             # back to the working branch
```

That's it — pushing `main` is what triggers the production deploy. There's no
separate "deploy" button to press.

## One-time setup that must be in place (or prod breaks)

Local secrets in `.env` are **gitignored on purpose** — they do NOT travel with
a push. Production reads its config from Vercel instead:

1. **Vercel → Project → Settings → Environment Variables**, add:
   - `VITE_SUPABASE_URL` = `https://zwwlyqcwpqenzpfezohv.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = the Supabase `anon` / `public` key
     (Supabase → Project Settings → API → "Legacy anon, service_role API keys")

   After adding/changing these, **redeploy** (Deployments → ⋯ → Redeploy) so the
   build picks them up. If they're missing, the live site shows a red
   "Backend not configured" banner.

2. **Supabase → Authentication → URL Configuration**:
   - **Site URL**: `https://www.myandthen.com` (must include `https://`)
   - **Redirect URLs**: include both `https://www.myandthen.com` and
     `http://localhost:5173` (for local testing)

   Magic-link emails redirect to these; if they're not allow-listed, sign-in
   links won't land.

## Local development

```bash
cp .env.example .env     # then paste the real Supabase URL + anon key
npm install
npm run dev              # http://localhost:5173
```

## Heads-up

- **Supabase is on the PRO plan** — it no longer auto-pauses. (On the old free
  plan it paused after ~7 days idle, which took the whole site down. Don't
  downgrade without expecting that to come back.)
- Database schema changes live in `supabase/migrations/`. Run new ones by
  pasting into **Supabase → SQL Editor** (the app can't run DDL itself).
