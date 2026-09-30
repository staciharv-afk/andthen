// Vercel serverless function — turns reviewed gift co-steward suggestions
// into real memorial_stewards invites and emails each one, in the
// recipient's name. This is the one and only moment any of that list is
// actually contacted — see gift_suggested_costewards' migration comment and
// api/claim-gift.js, which only ever links suggestions to the memorial,
// never emails them.
//
// Runs with the service role (same reasoning as api/accept-steward-invite.js:
// a plain client insert into memorial_stewards works under RLS in principle,
// but everything steward-invite-adjacent in this app has moved server-side
// after that RLS path "kept failing unexplainably" for regular co-steward
// invites). The caller's access token stands in for the RLS check instead —
// verified against actual stewardship of this exact memorial before any
// write happens.
//
// Required env: SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
// Optional: SUPABASE_URL (falls back to VITE_SUPABASE_URL), RESEND_FROM
import { createClient } from "@supabase/supabase-js";

const firstName = (full) => (full || "").trim().split(/\s+/)[0] || "";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY } = process.env;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const FROM_ADDRESS = (process.env.RESEND_FROM || "And Then <onboarding@resend.dev>").match(/<(.+)>/)?.[1] || "onboarding@resend.dev";
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
    return res.status(500).json({ error: "Not configured on the server." });
  }

  const { memorialId, sentIds, declinedIds, includeGifter } = req.body || {};
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

  const { data: memorial, error: memErr } = await admin
    .from("memorials")
    .select("id, name, steward_id, photo_url, crop_x, crop_y, born, passed, invite_code, slug")
    .eq("id", memorialId)
    .single();
  if (memErr || !memorial) return res.status(404).json({ error: "Page not found." });

  // Same check is_memorial_steward() encodes — the owner, or an accepted
  // co-steward — just run here since this call bypasses RLS entirely.
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

  const { data: giftRow } = await admin
    .from("gift_purchases")
    .select("recipient_name, gifter_name, gifter_email, gifter_wants_costeward")
    .eq("memorial_id", memorialId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const recipientName = giftRow?.recipient_name || firstName(caller.email) || "They";
  const recipientFirst = firstName(recipientName) || "They";
  const subjectFirst = firstName(memorial.name) || "them";

  // Skip anyone already a steward of this page (edge case from the spec) —
  // the owner themselves, or anyone already on memorial_stewards regardless
  // of status, so a stale duplicate suggestion can't re-invite someone who
  // already has (or is already being asked about) access.
  let ownerEmail = null;
  if (memorial.steward_id) {
    const { data: ownerData } = await admin.auth.admin.getUserById(memorial.steward_id);
    ownerEmail = ownerData?.user?.email?.toLowerCase() || null;
  }
  const { data: existingStewards } = await admin
    .from("memorial_stewards")
    .select("invited_email")
    .eq("memorial_id", memorialId);
  const existingEmails = new Set((existingStewards || []).map((r) => r.invited_email.toLowerCase()));
  if (ownerEmail) existingEmails.add(ownerEmail);

  const sentNames = [];
  // Same doubled-generator idiom as every other invite_token/contribute_token in this app (see src/lib/utils.js's uid()).
  const genToken = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  // Shared by every person invited here, whether they came from a
  // suggestion row or (below) the gifter's own "make me a co-steward too"
  // checkbox — same invite_token + magic-link + custom copy either way.
  // Returns true on success so the caller can decide what to clean up.
  const inviteOne = async (name, email) => {
    const lower = email.toLowerCase();
    if (existingEmails.has(lower)) return false;
    existingEmails.add(lower);

    const inviteToken = genToken() + genToken();
    const { error: insertErr } = await admin.from("memorial_stewards").insert({
      memorial_id: memorialId,
      invited_email: email,
      invited_name: name,
      invite_token: inviteToken,
      invited_by: caller.id,
    });
    if (insertErr) return false;

    const redirectTo = `https://www.myandthen.com/?steward_invite=${inviteToken}`;
    let link = redirectTo;
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    if (!linkErr && linkData?.properties?.action_link) link = linkData.properties.action_link;

    const rowFirst = firstName(name) || "there";
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${recipientFirst} via And Then <${FROM_ADDRESS}>`,
        to: [email],
        subject: `A page for ${subjectFirst}, and you're part of it`,
        text:
          `Hi ${rowFirst},\n\n` +
          `${recipientFirst} made this for ${subjectFirst}, and wants you to have it too. It's one place for everything we remember about ${subjectFirst}, from all of us and everyone who knew them. ` +
          `You can add your own memories, invite people and help ${recipientFirst.toLowerCase() === "they" ? "them" : recipientFirst} look after it.\n\n` +
          `Open ${subjectFirst}'s page:\n${link}\n\n` +
          `Love,\n${recipientFirst}\n\n` +
          `— No account needed. This link is just for you.`,
      }),
    });
    return true;
  };

  if (Array.isArray(sentIds) && sentIds.length) {
    const { data: rows } = await admin
      .from("gift_suggested_costewards")
      .select("id, name, email")
      .in("id", sentIds)
      .eq("memorial_id", memorialId)
      .eq("status", "pending");

    for (const row of rows || []) {
      await inviteOne(row.name, row.email); // already a steward → inviteOne no-ops, still resolved either way
      await admin.from("gift_suggested_costewards").delete().eq("id", row.id);
      sentNames.push(row.name);
    }
  }

  // The gifter's own "make me a co-steward too" checkbox — re-derived
  // server-side from gift_purchases (never trust a client-supplied
  // name/email for this), and only actioned if the gifter actually left an
  // email (that field is optional on the gift form).
  if (includeGifter && giftRow?.gifter_wants_costeward && giftRow?.gifter_email) {
    const ok = await inviteOne(giftRow.gifter_name || "them", giftRow.gifter_email);
    if (ok) sentNames.push(giftRow.gifter_name || "them");
  }

  if (Array.isArray(declinedIds) && declinedIds.length) {
    await admin
      .from("gift_suggested_costewards")
      .update({ status: "declined" })
      .in("id", declinedIds)
      .eq("memorial_id", memorialId)
      .eq("status", "pending");
  }

  return res.status(200).json({ sentNames });
}
