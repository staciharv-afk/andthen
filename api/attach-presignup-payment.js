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
// Required env vars (Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY           = Stripe secret key (sk_test_… while testing)
//   SUPABASE_SERVICE_ROLE_KEY   = Supabase service_role key (secret)
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
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
    if (session.payment_status !== "paid") return res.status(200).json({ skipped: "not paid" });

    const update = { is_paid: true, paused: false };
    if (session.customer) update.stripe_customer_id = typeof session.customer === "string" ? session.customer : session.customer.id;
    if (session.subscription) update.stripe_subscription_id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;

    const { error } = await admin.from("memorials").update(update).eq("id", memorialId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ attached: memorialId });
  } catch (e) {
    return res.status(502).json({ error: "Could not attach payment", detail: e.message });
  }
}
