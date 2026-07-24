// Vercel serverless function — Stripe webhook. When a checkout completes, it
// unlocks the memorial (sets is_paid = true) via the service_role key.
//
// Rather than verify the raw-body signature (fragile under Vercel's body
// parsing), we treat the POST only as a nudge: we re-fetch the session straight
// from Stripe by id and trust ONLY that. A forged POST can't unlock anything,
// because a session that Stripe reports as payment_status="paid" only exists if
// someone actually paid. Re-delivery is harmless (setting is_paid=true is
// idempotent).
//
// Required env vars:
//   STRIPE_SECRET_KEY           = Stripe secret key (sk_test_… while testing)
//   SUPABASE_SERVICE_ROLE_KEY   = Supabase service_role key (secret)
// Optional: SUPABASE_URL (falls back to VITE_SUPABASE_URL)
//
// Point a Stripe webhook (Dashboard → Developers → Webhooks) for the
// `checkout.session.completed` event at:  https://www.myandthen.com/api/stripe-webhook
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Payments are not configured on the server." });
  }

  const event = req.body;
  if (event?.type !== "checkout.session.completed") {
    return res.status(200).json({ ignored: event?.type || "unknown" });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  try {
    // Re-fetch from Stripe — the source of truth. Never trust the POST body's contents.
    const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
    if (session.payment_status !== "paid") {
      return res.status(200).json({ skipped: "not paid" });
    }
    const memorialId = session.metadata?.memorial_id;
    if (!memorialId) return res.status(200).json({ skipped: "no memorial_id" });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin.from("memorials").update({ is_paid: true }).eq("id", memorialId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ unlocked: memorialId });
  } catch (e) {
    return res.status(502).json({ error: "Webhook processing failed", detail: e.message });
  }
}
