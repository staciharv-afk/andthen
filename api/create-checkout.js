// Vercel serverless function — starts a Stripe Checkout to upgrade an
// EXISTING memorial (the Dashboard's "Upgrade" button, for a page still on
// the free tier). Same one tier as the pre-signup Pricing page
// (api/start-checkout.js) — "build" ($49 one-time) — built from the shared
// shape in api/_lib/stripeTiers.js, so a creator upgrading later gets
// identical pricing to one who pays upfront.
//
// Returns the hosted-checkout URL; the client redirects to it. The actual
// unlock happens server-side in stripe-webhook.js after payment, so nothing
// here trusts the client for payment state.
//
// Required env vars (Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY           = Stripe secret key (must be sk_live_… in production)
//   SUPABASE_SERVICE_ROLE_KEY   = Supabase service_role key (secret)
//   See api/_lib/stripeTiers.js for STRIPE_BUILD_FEE_PRICE_ID.
// Optional:
//   SUPABASE_URL                = falls back to VITE_SUPABASE_URL
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { buildCheckoutParams, stripeProductIdsConfigured } from "./_lib/stripeTiers.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !stripeProductIdsConfigured()) {
    return res.status(500).json({ error: "Payments are not configured on the server." });
  }

  const { memorialId, tier } = req.body || {};
  if (!memorialId) return res.status(400).json({ error: "Missing memorialId" });
  if (tier !== "build") return res.status(400).json({ error: "Unknown pricing tier" });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: rows, error } = await admin
    .from("memorials")
    .select("id, name, is_paid")
    .eq("id", memorialId)
    .limit(1);
  if (error) return res.status(500).json({ error: error.message });
  const memorial = rows?.[0];
  if (!memorial) return res.status(404).json({ error: "Memorial not found" });
  if (memorial.is_paid) return res.status(400).json({ error: "This memorial is already upgraded." });

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.create(buildCheckoutParams(tier, {
      metadata: { memorial_id: memorial.id, tier },
      success_url: `${origin}/?view=dashboard&upgraded=1`,
      cancel_url: `${origin}/?view=dashboard`,
    }));
    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(502).json({ error: "Could not start checkout", detail: e.message });
  }
}
