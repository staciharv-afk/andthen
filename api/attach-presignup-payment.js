// Vercel serverless function — attaches a pre-signup checkout (see
// start-checkout.js) to the memorial that was just created for it. Called
// once, client-side, right after the memorial insert succeeds in
// app.jsx's finishSignIn (the earliest point a memorial id exists to
// attach payment to).
//
// Never trusts the client's say-so that payment happened — re-fetches the
// session from Stripe by id and checks its actual payment_status, same
// "don't trust the POST, trust Stripe" approach as stripe-webhook.js.
//
// The Checkout Session is `mode: "payment"` (see api/_lib/stripeTiers.js) —
// a single one-time $49 build fee, no subscription ever created.
//
// Required env vars (Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY           = Stripe secret key (must be sk_live_… in production)
//   SUPABASE_SERVICE_ROLE_KEY   = Supabase service_role key (secret)
//   See api/_lib/stripeTiers.js for STRIPE_BUILD_FEE_PRODUCT_ID.
// Optional: SUPABASE_URL (falls back to VITE_SUPABASE_URL)
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Payments are not configured on the server." });
  }

  const { memorialId, sessionId } = req.body || {};
  if (!memorialId || !sessionId) return res.status(400).json({ error: "Missing memorialId or sessionId" });

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return res.status(200).json({ skipped: "not paid" });

    const customerId = session.customer ? (typeof session.customer === "string" ? session.customer : session.customer.id) : null;
    const update = { is_paid: true, paused: false };
    if (customerId) update.stripe_customer_id = customerId;

    const { error } = await admin.from("memorials").update(update).eq("id", memorialId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ attached: memorialId });
  } catch (e) {
    return res.status(502).json({ error: "Could not attach payment", detail: e.message });
  }
}
