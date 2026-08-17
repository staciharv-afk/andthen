// Vercel serverless function — starts a pre-signup Stripe Checkout for the
// pricing page's one tier. Unlike create-checkout.js (which upgrades an
// EXISTING memorial), there's no memorial yet at this point — the person
// hasn't signed up. Payment happens first; the memorial gets created after,
// through the normal magic-link onboarding flow, and is attached to this
// checkout session by api/attach-presignup-payment.js once it exists.
//
// Tier shape lives in api/_lib/stripeTiers.js, shared with create-checkout.js.
//
// Required env vars (Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY = Stripe secret key (must be sk_live_… in production)
//   See api/_lib/stripeTiers.js for STRIPE_BUILD_FEE_PRODUCT_ID.
import Stripe from "stripe";
import { buildCheckoutParams, stripeProductIdsConfigured } from "./_lib/stripeTiers.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { STRIPE_SECRET_KEY } = process.env;
  if (!STRIPE_SECRET_KEY || !stripeProductIdsConfigured()) {
    return res.status(500).json({ error: "Payments are not configured on the server." });
  }

  const tier = req.body?.tier;
  if (tier !== "build") return res.status(400).json({ error: "Unknown pricing tier" });

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.create(buildCheckoutParams(tier, {
      metadata: { tier },
      success_url: `${origin}/?view=onboarding&paid_session={CHECKOUT_SESSION_ID}&tier=${tier}`,
      cancel_url: `${origin}/?view=pricing`,
    }));
    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(502).json({ error: "Could not start checkout", detail: e.message });
  }
}
