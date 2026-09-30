// Vercel serverless function — accepts a co-steward invite on the
// invitee's behalf. This replaces a client-side update() gated by RLS
// policy "invitee accepts their invite" (20260817_page_stewards.sql):
// real invites kept coming back "not valid anymore" even with a
// still-pending token and a freshly signed-in session using the exact
// invited email, and it couldn't be pinned down further. Doing the write
// here with the service role sidesteps the policy entirely rather than
// continuing to chase it — the identity check below (verify the caller's
// access token, compare its email to the invite) is the same security
// boundary the policy was providing, just enforced server-side instead.
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

  const token = req.body?.token;
  if (!token) return res.status(400).json({ error: "Missing token" });

  const authHeader = req.headers.authorization || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!accessToken) return res.status(401).json({ error: "Not signed in." });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(accessToken);
  const user = userData?.user;
  if (userErr || !user?.email) return res.status(401).json({ error: "Invalid session." });

  const { data: rows, error } = await admin
    .from("memorial_stewards")
    .select("id, invited_email, status")
    .eq("invite_token", token)
    .limit(1);
  if (error) return res.status(500).json({ error: error.message });

  // A mismatch (wrong email, already accepted, canceled/re-invited token)
  // isn't a server error — it's just not something to accept. The client
  // shows its own "ask for a fresh one" message either way.
  const invite = rows?.[0];
  if (!invite || invite.status !== "pending" || invite.invited_email.toLowerCase() !== user.email.toLowerCase()) {
    return res.status(200).json({ accepted: false });
  }

  const { error: updateErr } = await admin
    .from("memorial_stewards")
    .update({ status: "accepted", user_id: user.id, accepted_at: new Date().toISOString() })
    .eq("id", invite.id);
  if (updateErr) return res.status(500).json({ error: updateErr.message });

  return res.status(200).json({ accepted: true });
}
