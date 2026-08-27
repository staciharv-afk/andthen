// Vercel serverless function — records "Not right now" on /claim-gift
// (src/pages/ClaimGift.jsx). No sign-in involved: the recipient may decline
// without ever creating an account, and the Stripe session id from their
// claim email is the only credential this needs, same as get-gift.js.
//
// Deliberately does not touch anything if the gift was already claimed —
// declining is a one-way signal from a recipient who hasn't acted yet, not
// something that should undo a page that already exists. Re-declining an
// already-declined gift is a harmless no-op (the page is revisitable by
// design), and never notifies the gifter either way — the response stays
// private, per product decision.
//
// Required env: SUPABASE_SERVICE_ROLE_KEY
// Optional: SUPABASE_URL (falls back to VITE_SUPABASE_URL)
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Not configured on the server." });
  }

  const sessionId = req.body?.sessionId;
  if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await admin
    .from("gift_purchases")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("stripe_session_id", sessionId)
    .eq("status", "sent");
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ declined: true });
}
