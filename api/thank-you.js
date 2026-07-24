// Vercel serverless function — emails a contributor a thank-you after their
// memory is approved. Called (fire-and-forget) from the dashboard on approve,
// and on submit for memorials that don't require approval.
//
// Security: the client only sends a contributionId. This function looks the
// row up with the Supabase service_role key (server-side only), so it can only
// ever email the address actually stored on a real, approved contribution —
// it can't be used to send mail to arbitrary addresses.
//
// Required env vars (set in Vercel → Settings → Environment Variables):
//   SUPABASE_SERVICE_ROLE_KEY   = Supabase → Settings → API → service_role (secret)
//   RESEND_API_KEY              = Resend API key (secret)
// Optional:
//   RESEND_FROM                 = e.g. "And Then <hello@myandthen.com>"
//                                 (defaults to Resend's sandbox sender)
//   SUPABASE_URL                = falls back to VITE_SUPABASE_URL (already in Vercel)
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // SUPABASE_URL falls back to VITE_SUPABASE_URL (already set in Vercel), so the
  // only new secrets to add are the service-role key and the Resend key.
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const { SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY } = process.env;
  const FROM = process.env.RESEND_FROM || "And Then <onboarding@resend.dev>";
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
    return res.status(500).json({ error: "Email is not configured on the server." });
  }

  const contributionId = req.body?.contributionId;
  if (!contributionId) return res.status(400).json({ error: "Missing contributionId" });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error } = await admin
    .from("contributions")
    .select("id, status, contributor_name, contributor_email, thanked_at, memorials(name, invite_code)")
    .eq("id", contributionId)
    .limit(1);
  if (error) return res.status(500).json({ error: error.message });

  const c = rows?.[0];
  if (!c) return res.status(404).json({ error: "Not found" });
  // Only thank real, approved memories that left an email, and only once.
  if (c.status !== "approved") return res.status(200).json({ skipped: "not approved" });
  if (!c.contributor_email) return res.status(200).json({ skipped: "no email" });
  if (c.thanked_at) return res.status(200).json({ skipped: "already thanked" });

  const memorialName = c.memorials?.name || "your loved one";
  const firstName = (c.contributor_name || "there").trim().split(" ")[0];
  const inviteCode = c.memorials?.invite_code;
  const forwardLine = inviteCode
    ? `\n\nKnow someone else who knew ${memorialName}? Send them this link so they can add a memory too:\nhttps://www.myandthen.com/?memorial=${inviteCode}`
    : "";

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [c.contributor_email],
      subject: `Thank you for sharing a memory of ${memorialName}`,
      text:
        `Hi ${firstName},\n\n` +
        `Thank you for sharing a memory of ${memorialName}. It means a great deal to have ` +
        `your story kept alongside everyone else's — it's part of them now, and it stays.` +
        forwardLine +
        `\n\nWith gratitude,\nAnd Then`,
    }),
  });

  if (!emailRes.ok) {
    const detail = await emailRes.text().catch(() => "");
    return res.status(502).json({ error: "Email send failed", detail });
  }

  await admin.from("contributions").update({ thanked_at: new Date().toISOString() }).eq("id", c.id);
  return res.status(200).json({ sent: true });
}
