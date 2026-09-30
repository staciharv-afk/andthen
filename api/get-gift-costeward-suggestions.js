// Vercel serverless function — re-fetches a memorial's pending gift
// co-steward suggestions plus the gifter's own details, for the dashboard's
// "Review" button (reopening the same screen shown right after claim — see
// api/claim-gift.js, which returns this same shape inline for that first
// pass). gift_purchases has no client-facing grants at all, so this is the
// one narrow, service-role-mediated way back in once the immediate
// post-claim moment has passed.
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

  const memorialId = req.body?.memorialId;
  if (!memorialId) return res.status(400).json({ error: "Missing memorialId" });

  const authHeader = req.headers.authorization || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!accessToken) return res.status(401).json({ error: "Not signed in." });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(accessToken);
  const caller = userData?.user;
  if (userErr || !caller) return res.status(401).json({ error: "Invalid session." });

  const { data: memorial } = await admin.from("memorials").select("steward_id").eq("id", memorialId).single();
  if (!memorial) return res.status(404).json({ error: "Page not found." });
  let isSteward = memorial.steward_id === caller.id;
  if (!isSteward) {
    const { data: stewardRow } = await admin
      .from("memorial_stewards")
      .select("id")
      .eq("memorial_id", memorialId)
      .eq("user_id", caller.id)
      .eq("status", "accepted")
      .limit(1);
    isSteward = !!stewardRow?.length;
  }
  if (!isSteward) return res.status(403).json({ error: "Not a steward of this page." });

  const { data: suggested } = await admin
    .from("gift_suggested_costewards")
    .select("id, name, email")
    .eq("memorial_id", memorialId)
    .eq("status", "pending");

  const { data: giftRow } = await admin
    .from("gift_purchases")
    .select("gifter_name, gifter_email, gifter_wants_costeward")
    .eq("memorial_id", memorialId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return res.status(200).json({
    suggestedCostewards: suggested || [],
    gifterName: giftRow?.gifter_name || null,
    gifterEmail: giftRow?.gifter_email || null,
    gifterWantsCosteward: !!giftRow?.gifter_wants_costeward,
  });
}
