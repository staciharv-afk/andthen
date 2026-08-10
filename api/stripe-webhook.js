// Vercel serverless function — Stripe webhook.
//
// Handles two things:
// 1. checkout.session.completed — unlocks a memorial (is_paid = true) for
//    the EXISTING post-signup upgrade flow (create-checkout.js's $149
//    upgrade, metadata.memorial_id). Pre-signup checkouts (start-checkout.js)
//    have no memorial_id yet at this point — they're skipped here and
//    unlocked instead by attach-presignup-payment.js once the memorial
//    exists, right after magic-link signup completes.
// 2. customer.subscription.updated / customer.subscription.deleted — the
//    "pay as you go" tier's $10/yr renewal. When a subscription's status
//    moves to past_due/unpaid/canceled (Stripe already retried and gave up),
//    the matching memorial (by stripe_subscription_id) gets paused = true;
//    moving back to active (e.g. they update their card and the retry
//    succeeds) un-pauses it. This is the "miss a payment and the page
//    pauses, it doesn't disappear" behavior promised on the pricing page.
//
// Rather than verify the raw-body signature (fragile under Vercel's body
// parsing), we treat the POST only as a nudge: we re-fetch the object
// straight from Stripe by id and trust ONLY that. A forged POST can't
// unlock or un-pause anything, because Stripe reporting it that way only
// happens if it's actually true. Re-delivery is harmless — every write here
// is idempotent.
//
// Required env vars:
//   STRIPE_SECRET_KEY           = Stripe secret key (sk_test_… while testing)
//   SUPABASE_SERVICE_ROLE_KEY   = Supabase service_role key (secret)
// Optional: SUPABASE_URL (falls back to VITE_SUPABASE_URL)
//
// Point a Stripe webhook (Dashboard → Developers → Webhooks) at:
//   https://www.myandthen.com/api/stripe-webhook
// for events: checkout.session.completed, customer.subscription.updated,
// customer.subscription.deleted
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Statuses Stripe uses once its own automatic retry schedule has been
// exhausted (or the subscription was outright canceled) — anything before
// this (e.g. a single retry still pending) is left alone, not paused.
const LAPSED_STATUSES = ["past_due", "unpaid", "canceled", "incomplete_expired"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Payments are not configured on the server." });
  }

  const event = req.body;
  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    if (event?.type === "checkout.session.completed") {
      // Re-fetch from Stripe — the source of truth. Never trust the POST body's contents.
      const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
      if (session.payment_status !== "paid") return res.status(200).json({ skipped: "not paid" });
      const memorialId = session.metadata?.memorial_id;
      if (!memorialId) return res.status(200).json({ skipped: "no memorial_id — likely a pre-signup checkout" });

      const { error } = await admin.from("memorials").update({ is_paid: true }).eq("id", memorialId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ unlocked: memorialId });
    }

    if (event?.type === "customer.subscription.updated" || event?.type === "customer.subscription.deleted") {
      const subscriptionId = event.data.object.id;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const paused = LAPSED_STATUSES.includes(subscription.status);

      const { data: rows, error: findErr } = await admin
        .from("memorials")
        .select("id, paused")
        .eq("stripe_subscription_id", subscriptionId)
        .limit(1);
      if (findErr) return res.status(500).json({ error: findErr.message });
      const memorial = rows?.[0];
      if (!memorial) return res.status(200).json({ skipped: "no memorial for this subscription" });
      if (memorial.paused === paused) return res.status(200).json({ unchanged: memorial.id, paused });

      const { error } = await admin.from("memorials").update({ paused }).eq("id", memorial.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ [paused ? "paused" : "unpaused"]: memorial.id });
    }

    return res.status(200).json({ ignored: event?.type || "unknown" });
  } catch (e) {
    return res.status(502).json({ error: "Webhook processing failed", detail: e.message });
  }
}
