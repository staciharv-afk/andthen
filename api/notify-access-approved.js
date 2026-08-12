// Vercel serverless function — emails a requester their personal contribute
// link after the memorial's creator approves their access request. Called
// fire-and-forget right after the client marks the request approved, with
// just a requestId. The server re-derives the token from the DB rather than
// trusting anything from the client, and only ever emails the address
// actually stored on a real, approved request.
//
// Required env: SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
// Optional: SUPABASE_URL (falls back to VITE_SUPABASE_URL), RESEND_FROM
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY } = process.env;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const FROM = process.env.RESEND_FROM || "And Then <onboarding@resend.dev>";
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
    return res.status(500).json({ error: "Email is not configured on the server." });
  }

  const requestId = req.body?.requestId;
  if (!requestId) return res.status(400).json({ error: "Missing requestId" });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error } = await admin
    .from("access_requests")
    .select("id, requester_name, requester_email, status, contribute_token, memorials(name, invite_code, slug)")
    .eq("id", requestId)
    .limit(1);
  if (error) return res.status(500).json({ error: error.message });

  const r = rows?.[0];
  if (!r) return res.status(404).json({ error: "Not found" });
  if (r.status !== "approved" || !r.contribute_token) return res.status(200).json({ skipped: "not approved" });
  if (!r.requester_email) return res.status(200).json({ skipped: "no email" });

  const memorial = r.memorials;
  const firstName = (r.requester_name || "there").trim().split(" ")[0];
  const memorialName = memorial?.name || "their";
  // Same slug-preferred URL shape the dashboard's own memorialUrl() builds —
  // either form works with the token appended, since the token is checked
  // independently of how the page itself was reached.
  const base = memorial?.slug
    ? `https://www.myandthen.com/${memorial.slug}`
    : `https://www.myandthen.com/?memorial=${memorial?.invite_code}`;
  const link = `${base}${base.includes("?") ? "&" : "?"}token=${r.contribute_token}`;

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [r.requester_email],
      subject: `You're in — add your memory of ${memorialName}`,
      text:
        `Hi ${firstName},\n\n` +
        `${memorialName}'s family said yes — here's your way in to add a memory, whenever you're ready:\n${link}\n\n` +
        `With care,\nAnd Then`,
    }),
  });
  if (!emailRes.ok) {
    const detail = await emailRes.text().catch(() => "");
    return res.status(502).json({ error: "Email send failed", detail });
  }
  return res.status(200).json({ sent: true });
}
