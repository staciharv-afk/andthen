// Vercel serverless function — emails a memorial's creator when someone asks
// for access to add a memory. Called fire-and-forget with just a memorialId
// (not a requestId — the request that was just inserted isn't readable back
// by its own anonymous inserter under RLS, so, like notify-creator.js, this
// finds the newest un-notified pending request for the memorial itself using
// the service_role key, dedupes via notified_at, and only ever emails the
// memorial's own steward.
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

  // Newest pending request we haven't notified about yet.
  const { data: rrows } = await admin
    .from("access_requests")
    .select("id, requester_name, relationship, note")
    .eq("memorial_id", memorialId)
    .eq("status", "pending")
    .is("notified_at", null)
    .order("created_at", { ascending: false })
    .limit(1);
  const r = rrows?.[0];
  if (!r) return res.status(200).json({ skipped: "nothing new" });

  // Mark it notified up front so we never double-send.
  await admin.from("access_requests").update({ notified_at: new Date().toISOString() }).eq("id", r.id);

  const { data: userData } = await admin.auth.admin.getUserById(memorial.steward_id);
  const to = userData?.user?.email;
  if (!to) return res.status(200).json({ skipped: "no steward email" });

  const who = (r.requester_name || "Someone").trim();
  const relLine = r.relationship ? ` They said they're ${r.relationship}.` : "";
  const noteLine = r.note ? `\n\nTheir note: "${r.note}"` : "";

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject: `${who} asked to add a memory to ${memorial.name}'s page`,
      text:
        `${who} found ${memorial.name}'s page and asked to add a memory.${relLine}` +
        noteLine +
        `\n\nReview it on your dashboard:\nhttps://www.myandthen.com/?view=dashboard\n\n` +
        `— And Then`,
    }),
  });
  if (!emailRes.ok) {
    const detail = await emailRes.text().catch(() => "");
    return res.status(502).json({ error: "Email send failed", detail });
  }
  return res.status(200).json({ notified: r.id });
}
