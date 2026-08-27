// Vercel serverless function — starts a hosted Stripe Checkout for a gifted
// $49 build fee. Same tier/price as every other checkout entry point (see
// api/_lib/stripeTiers.js), but for someone who doesn't have — and may never
// sign up for — a memorial of their own; the recipient is a stranger to us
// until they claim it, so there's nothing to attach this to yet the way
// create-checkout.js attaches an upgrade to an existing memorialId.
//
// No sign-in required, matching start-checkout.js's pre-signup path — the
// gifter's email comes from Stripe Checkout's own email collection, not a
// Supabase session (most gifters won't have an And Then account at all).
//
// The actual gift_purchases row is created in stripe-webhook.js after
// payment; this only ever hands back a redirect url.
//
// Required env vars (Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY = Stripe secret key (must be sk_live_… in production)
//   See api/_lib/stripeTiers.js for STRIPE_BUILD_FEE_PRICE_ID.
import Stripe from "stripe";
import { buildCheckoutParams, stripeProductIdsConfigured } from "./_lib/stripeTiers.js";

const MAX_NAME_LEN = 200;
const MAX_MESSAGE_LEN = 2000;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { STRIPE_SECRET_KEY } = process.env;
  if (!STRIPE_SECRET_KEY || !stripeProductIdsConfigured()) {
    return res.status(500).json({ error: "Payments are not configured on the server." });
  }

  const { recipientName, recipientEmail, giftMessage, gifterName, gifterEmail } = req.body || {};
  const name = (recipientName || "").trim().slice(0, MAX_NAME_LEN);
  const email = (recipientEmail || "").trim().toLowerCase();
  if (!name) return res.status(400).json({ error: "Please enter the recipient's name." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Please enter a valid recipient email." });

  const message = (giftMessage || "").trim().slice(0, MAX_MESSAGE_LEN);
  const fromName = (gifterName || "").trim().slice(0, MAX_NAME_LEN);
  const fromEmail = (gifterEmail || "").trim().toLowerCase();

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.create(buildCheckoutParams("build", {
      metadata: {
        tier: "build",
        is_gift: "true",
        recipient_name: name,
        recipient_email: email,
        gift_message: message,
        gifter_name: fromName,
        gifter_email: fromEmail,
      },
      ...(fromEmail && EMAIL_RE.test(fromEmail) ? { customer_email: fromEmail } : {}),
      success_url: `${origin}/?view=pricing&gift_sent=1`,
      cancel_url: `${origin}/?view=pricing`,
    }));
    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(502).json({ error: "Could not start checkout", detail: e.message });
  }
}
