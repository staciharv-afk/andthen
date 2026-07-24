// Vercel Cron (daily) — emails a memorial's creator on the anniversary of the
// person's birth or passing. Paid feature: only runs for is_paid memorials.
// Goes to the steward (consented — it's their memorial), not contributors.
//
// Scheduled in vercel.json. Vercel adds `Authorization: Bearer <CRON_SECRET>`
// to cron invocations when CRON_SECRET is set — we verify it so the endpoint
// can't be triggered by anyone.
//
// Env: SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, CRON_SECRET
// Optional: SUPABASE_URL (falls back to VITE_SUPABASE_URL), RESEND_FROM
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY } = process.env;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const FROM = process.env.RESEND_FROM || "And Then <onboarding@resend.dev>";
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
    return res.status(500).json({ error: "Not configured" });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const monthDay = todayISO.slice(5); // "MM-DD"

  const { data: memorials, error } = await admin
    .from("memorials")
    .select("id, name, born, passed, invite_code, steward_id, anniversary_notified_on")
    .eq("is_paid", true);
  if (error) return res.status(500).json({ error: error.message });

  let sent = 0;
  for (const m of memorials || []) {
    if (m.anniversary_notified_on === todayISO) continue; // already done today
    const passedMatch = m.passed && m.passed.slice(5) === monthDay;
    const bornMatch = m.born && m.born.slice(5) === monthDay;
    if (!passedMatch && !bornMatch) continue;
    if (!m.steward_id) continue;

    const { data: userData } = await admin.auth.admin.getUserById(m.steward_id);
    const to = userData?.user?.email;
    // Mark done first so a retry can't double-send.
    await admin.from("memorials").update({ anniversary_notified_on: todayISO }).eq("id", m.id);
    if (!to) continue;

    const occasion = passedMatch
      ? `Today marks the anniversary of the day ${m.name} passed.`
      : `Today would have been ${m.name}'s birthday.`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: `Remembering ${m.name} today`,
        text:
          `${occasion}\n\n` +
          `It might be a good day to revisit their memorial — reread the stories, ` +
          `or invite someone new to add one:\n` +
          `https://www.myandthen.com/?memorial=${m.invite_code}\n\n` +
          `With care,\nAnd Then`,
      }),
    });
    if (emailRes.ok) sent++;
  }

  return res.status(200).json({ checked: memorials?.length || 0, sent });
}
