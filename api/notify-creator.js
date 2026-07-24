// Vercel serverless function — emails a memorial's creator when a new memory
// arrives. Called fire-and-forget from the contributor submit flow with just a
// memorialId. Using the service_role key it finds the newest un-notified
// contribution for that memorial, dedupes via notified_at (one email per memory),
// and enforces a 5-per-day cap. It only ever emails the memorial's own steward
// (looked up server-side), so it can't be used to spam arbitrary addresses.
//
// Required env: SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
// Optional: SUPABASE_URL (falls back to VITE_SUPABASE_URL), RESEND_FROM
import { createClient } from "@supabase/supabase-js";

const TYPE_LABEL = { story: "story", photo: "photo", video: "video", voice: "voice memo" };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY } = process.env;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const FROM = process.env.RESEND_FROM || "And Then <onboarding@resend.dev>";
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
    return res.status(500).json({ error: "Email is not configured on the server." });
  }

  const memorialId = req.body?.memorialId;
  if (!memorialId) return res.status(400).json({ error: "Missing memorialId" });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: mrows, error: mErr } = await admin
    .from("memorials").select("id, name, steward_id").eq("id", memorialId).limit(1);
  if (mErr) return res.status(500).json({ error: mErr.message });
  const memorial = mrows?.[0];
  if (!memorial) return res.status(404).json({ error: "Memorial not found" });
  if (!memorial.steward_id) return res.status(200).json({ skipped: "no steward" });

  // Newest memory we haven't notified about yet.
  const { data: crows } = await admin
    .from("contributions")
    .select("id, contributor_name, type")
    .eq("memorial_id", memorialId)
    .is("notified_at", null)
    .order("created_at", { ascending: false })
    .limit(1);
  const c = crows?.[0];
  if (!c) return res.status(200).json({ skipped: "nothing new" });

  // Mark it notified up front so we never double-send (dedupe > delivery here).
  await admin.from("contributions").update({ notified_at: new Date().toISOString() }).eq("id", c.id);

  // Daily cap: at most 5 notification emails per memorial per day.
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count } = await admin
    .from("contributions")
    .select("id", { count: "exact", head: true })
    .eq("memorial_id", memorialId)
    .gte("created_at", startOfDay.toISOString());
  if ((count || 0) > 5) return res.status(200).json({ skipped: "daily cap" });

  const { data: userData } = await admin.auth.admin.getUserById(memorial.steward_id);
  const to = userData?.user?.email;
  if (!to) return res.status(200).json({ skipped: "no steward email" });

  const who = (c.contributor_name || "Someone").trim();
  const what = TYPE_LABEL[c.type] || "memory";

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject: `New memory on ${memorial.name}'s page`,
      text:
        `${who} just shared a ${what} on ${memorial.name}'s memorial.\n\n` +
        `Review it on your dashboard:\nhttps://www.myandthen.com/?view=dashboard\n\n` +
        `— And Then`,
    }),
  });
  if (!emailRes.ok) {
    const detail = await emailRes.text().catch(() => "");
    return res.status(502).json({ error: "Email send failed", detail });
  }
  return res.status(200).json({ notified: c.id });
}
