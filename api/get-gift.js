// Vercel serverless function — looks up a gift by its Stripe Checkout
// Session id for /claim-gift (src/pages/ClaimGift.jsx). The session id is
// the only credential a recipient has (it's what's in their claim email),
// and gift_purchases has no anon/authenticated grants at all — this is the
// one narrow, service_role-mediated way in. Never returns gifter_email or
// recipient_email; the claim page has no reason to see either.
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
  const { data: rows, error } = await admin
    .from("gift_purchases")
    .select("recipient_name, gifter_name, gift_message, status")
    .eq("stripe_session_id", sessionId)
    .limit(1);
  if (error) return res.status(500).json({ error: error.message });
  const gift = rows?.[0];
  if (!gift) return res.status(404).json({ error: "Gift not found" });
  return res.status(200).json({ gift });
}
