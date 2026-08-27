// Vercel serverless function — finalizes a gift claim. Called from
// app.jsx's finishSignIn, right after the recipient's own magic-link
// sign-in creates their memorial (same moment attach-presignup-payment.js
// is called for a normal pre-signup purchase — see pendingGiftClaim.js for
// the localStorage handoff that carries the session id through that flow).
//
// Never trusts the client's say-so that this gift is real — re-fetches the
// Checkout Session from Stripe and checks payment_status + metadata.is_gift
// itself, same "don't trust the POST, trust Stripe" approach as
// attach-presignup-payment.js. Only unlocks a memorial that was actually
// just created for this claim (memorialId comes from the client, same trust
// model attach-presignup-payment.js already uses for that field) and only
// consumes a gift that's still 'sent' — a gift already claimed or declined
// can't be re-claimed onto a different memorial.
//
// Required env vars:
//   STRIPE_SECRET_KEY           = Stripe secret key (must be sk_live_… in production)
//   SUPABASE_SERVICE_ROLE_KEY   = Supabase service_role key (secret)
// Optional: SUPABASE_URL (falls back to VITE_SUPABASE_URL)
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Not configured on the server." });
  }

  const { sessionId, memorialId } = req.body || {};
  if (!sessionId || !memorialId) return res.status(400).json({ error: "Missing sessionId or memorialId" });

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" || session.metadata?.is_gift !== "true") {
      return res.status(200).json({ skipped: "not a paid gift session" });
    }

    const { data: giftRows, error: giftErr } = await admin
      .from("gift_purchases")
      .update({ status: "claimed", memorial_id: memorialId, responded_at: new Date().toISOString() })
      .eq("stripe_session_id", sessionId)
      .eq("status", "sent")
      .select();
    if (giftErr) return res.status(500).json({ error: giftErr.message });
    if (!giftRows?.length) return res.status(200).json({ skipped: "gift already claimed or declined" });

    const { error: memErr } = await admin
      .from("memorials")
      .update({ is_paid: true, paused: false })
      .eq("id", memorialId);
    if (memErr) return res.status(500).json({ error: memErr.message });

    return res.status(200).json({ claimed: memorialId });
  } catch (e) {
    return res.status(502).json({ error: "Could not claim gift", detail: e.message });
  }
}
