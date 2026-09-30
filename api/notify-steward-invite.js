// Vercel serverless function — emails a co-steward invite. Called
// fire-and-forget right after the client inserts a pending memorial_stewards
// row, with just that row's id. The server re-derives everything from the
// DB rather than trusting anything from the client, and only ever emails
// the address actually stored on a real, pending invite.
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

  const inviteId = req.body?.inviteId;
  if (!inviteId) return res.status(400).json({ error: "Missing inviteId" });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error } = await admin
    .from("memorial_stewards")
    .select("id, invited_email, status, invite_token, invited_by, memorials(name, invite_code, slug)")
    .eq("id", inviteId)
    .limit(1);
  if (error) return res.status(500).json({ error: error.message });

  const invite = rows?.[0];
  if (!invite) return res.status(404).json({ error: "Not found" });
  if (invite.status !== "pending" || !invite.invite_token) return res.status(200).json({ skipped: "not pending" });
  if (!invite.invited_email) return res.status(200).json({ skipped: "no email" });

  const memorial = invite.memorials;
  const memorialName = memorial?.name || "their";
  const redirectTo = `https://www.myandthen.com/?steward_invite=${invite.invite_token}`;

  // A bare app link made the invitee do a second, separate sign-in (request
  // their own magic link, then have to remember to use the exact invited
  // address) before app.jsx would ever look at the stashed invite token —
  // easy to fumble, and the likely cause of "that invite link isn't valid
  // anymore" reports. generateLink produces a real Supabase auth link for
  // this exact email that signs them in AND redirects to the same
  // steward_invite URL, so clicking it does both steps at once. Falls back
  // to the bare link (the old behavior) if generation fails for any reason,
  // so a hiccup here never blocks the invite email from going out.
  let link = redirectTo;
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: invite.invited_email,
    options: { redirectTo },
  });
  if (!linkErr && linkData?.properties?.action_link) link = linkData.properties.action_link;

  let inviterLine = "";
  if (invite.invited_by) {
    const { data: userData } = await admin.auth.admin.getUserById(invite.invited_by);
    const inviterEmail = userData?.user?.email;
    if (inviterEmail) inviterLine = ` (${inviterEmail} added you)`;
  }

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [invite.invited_email],
      subject: `You've been invited to help steward ${memorialName}'s page`,
      text:
        `Hi,\n\n` +
        `You've been invited to help steward ${memorialName}'s page on And Then${inviterLine} — ` +
        `you'll be able to edit the page, review new memories, and invite others too.\n\n` +
        `Accept the invite:\n${link}\n\n` +
        `With care,\nAnd Then`,
    }),
  });
  if (!emailRes.ok) {
    const detail = await emailRes.text().catch(() => "");
    return res.status(502).json({ error: "Email send failed", detail });
  }
  return res.status(200).json({ sent: true });
}
