// Vercel serverless function — starts a pre-signup Stripe Checkout for one of
// the two pricing-page tiers. Unlike create-checkout.js (which upgrades an
// EXISTING memorial), there's no memorial yet at this point — the person
// hasn't signed up. Payment happens first; the memorial gets created after,
// through the normal magic-link onboarding flow, and is attached to this
// checkout session by api/attach-presignup-payment.js once it exists.
//
// "payg" ($49 + $10/yr): subscription-mode Checkout with one one-time
// price_data line item (the $49 build fee) alongside one recurring
// price_data line item (the $10/yr renewal) — Stripe Checkout allows exactly
// one non-recurring "setup fee" line item in subscription mode alongside the
// recurring ones. NOTE: this specific mixed-line-item shape hasn't been
// exercised against a real Stripe account from this codebase before (every
// existing checkout here is single-item, one-time `mode: "payment"") — test
// it in Stripe test mode before relying on it in production.
//
// "forever" ($100 one-time): plain one-time payment, same shape as the
// existing $149 upgrade in create-checkout.js.
//
// Required env vars (Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY = Stripe secret key (sk_test_… while testing)
import Stripe from "stripe";

const TIERS = {
  payg: { buildFeeCents: 4900, renewalCents: 1000 },
  forever: { priceCents: 10000 },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { STRIPE_SECRET_KEY } = process.env;
  if (!STRIPE_SECRET_KEY) return res.status(500).json({ error: "Payments are not configured on the server." });

  const tier = req.body?.tier;
  if (!TIERS[tier]) return res.status(400).json({ error: "Unknown pricing tier" });

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  try {
    let session;
    if (tier === "forever") {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: TIERS.forever.priceCents,
              product_data: { name: "And Then — Forever plan" },
            },
          },
        ],
        allow_promotion_codes: true,
        metadata: { tier: "forever" },
        success_url: `${origin}/?view=onboarding&paid_session={CHECKOUT_SESSION_ID}&tier=forever`,
        cancel_url: `${origin}/?view=pricing`,
      });
    } else {
      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: TIERS.payg.buildFeeCents,
              product_data: { name: "And Then — build fee" },
            },
          },
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: TIERS.payg.renewalCents,
              recurring: { interval: "year" },
              product_data: { name: "And Then — annual hosting" },
            },
          },
        ],
        allow_promotion_codes: true,
        metadata: { tier: "payg" },
        success_url: `${origin}/?view=onboarding&paid_session={CHECKOUT_SESSION_ID}&tier=payg`,
        cancel_url: `${origin}/?view=pricing`,
      });
    }
    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(502).json({ error: "Could not start checkout", detail: e.message });
  }
}
