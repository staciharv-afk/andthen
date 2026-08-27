// Vercel serverless function — Stripe webhook.
//
// Handles three things:
// 1. checkout.session.completed — unlocks a memorial (is_paid = true) for
//    the EXISTING post-signup upgrade flow (create-checkout.js,
//    metadata.memorial_id). The Checkout Session here is `mode: "payment"`
//    (see api/_lib/stripeTiers.js) — a single one-time $49 build fee, no
//    subscription ever created. Pre-signup checkouts (start-checkout.js)
//    have no memorial_id yet at this point — they're skipped here and
//    unlocked instead by attach-presignup-payment.js once the memorial
//    exists, right after magic-link signup completes.
// 1b. checkout.session.completed with metadata.is_gift === "true"
//    (create-gift-checkout.js) — records the gift in gift_purchases and
//    emails the recipient their claim link. See below.
// 2. customer.subscription.updated / customer.subscription.deleted — no
//    purchase creates a subscription anymore (the $10/yr "keeper's fee" was
//    retired; this is now a one-time-only tier), so this branch is inert
//    for every new purchase. Left in place only so any subscription created
//    before that change keeps behaving correctly: when its status moves to
//    past_due/unpaid/canceled (Stripe already retried and gave up), the
//    matching memorial (by stripe_subscription_id) gets paused = true;
//    moving back to active un-pauses it. Safe to delete once no memorial
//    has a stripe_subscription_id left.
//
// Rather than verify the raw-body signature (fragile under Vercel's body
// parsing), we treat the POST only as a nudge: we re-fetch the object
// straight from Stripe by id and trust ONLY that. A forged POST can't
// unlock or un-pause anything, because Stripe reporting it that way only
// happens if it's actually true. Re-delivery is harmless — every write here
// is idempotent.
//
// Required env vars:
//   STRIPE_SECRET_KEY           = Stripe secret key (sk_test_… while testing)
//   SUPABASE_SERVICE_ROLE_KEY   = Supabase service_role key (secret)
// Optional: SUPABASE_URL (falls back to VITE_SUPABASE_URL), RESEND_API_KEY,
//   RESEND_FROM (gift emails are best-effort — a failed send doesn't undo
//   the gift_purchases row, since the payment already succeeded)
//
// Point a Stripe webhook (Dashboard → Developers → Webhooks) at:
//   https://www.myandthen.com/api/stripe-webhook
// for events: checkout.session.completed, customer.subscription.updated,
// customer.subscription.deleted
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { renderGiftConfirmationEmail } from "./_lib/giftConfirmationEmail.js";

// Pass `html` to send multipart (Resend delivers HTML + text together when
// both are present); omit it for a plain-text-only send, like every other
// email in this app.
async function sendResendEmail({ to, subject, text, html }) {
  const { RESEND_API_KEY } = process.env;
  const FROM = process.env.RESEND_FROM || "And Then <onboarding@resend.dev>";
  if (!RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, text, ...(html ? { html } : {}) }),
    });
  } catch {
    // Best-effort — the gift itself is already recorded; a failed send just
    // means no email went out, not a broken purchase.
  }
}

async function handleGiftCheckout(session, admin) {
  const m = session.metadata || {};
  const gifterEmail = (m.gifter_email || session.customer_details?.email || "").trim() || null;
  const gifterName = (m.gifter_name || "").trim() || null;
  const recipientName = (m.recipient_name || "").trim();
  const recipientEmail = (m.recipient_email || "").trim();
  const giftMessage = (m.gift_message || "").trim() || null;
  if (!recipientName || !recipientEmail) return { skipped: "gift metadata missing" };

  const { data: inserted, error } = await admin
    .from("gift_purchases")
    .insert({
      stripe_session_id: session.id,
      gifter_email: gifterEmail,
      gifter_name: gifterName,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      gift_message: giftMessage,
      status: "sent",
    })
    .select()
    .single();

  if (error) {
    // Unique violation on stripe_session_id = Stripe already retried this
    // event and we've already recorded + emailed it once — skip silently
    // rather than sending a duplicate claim email.
    if (error.code === "23505") return { skipped: "already recorded" };
    return { error: error.message };
  }

  const gifter = gifterName || "Someone";
  const claimUrl = `https://www.myandthen.com/?view=claim-gift&session=${encodeURIComponent(session.id)}`;
  const quoted = giftMessage ? `\n\n"${giftMessage}"\n` : "";

  await sendResendEmail({
    to: recipientEmail,
    subject: `${gifter} sent you a gift`,
    text:
      `Hi ${recipientName.split(" ")[0]},\n\n` +
      `${gifter} thought you might want a place to gather someone's stories — a page on And Then, ` +
      `already paid for, waiting for you whenever you're ready.` +
      quoted +
      `\n\nSee it here:\n${claimUrl}\n\n— And Then`,
  });

  if (gifterEmail) {
    const confirmation = renderGiftConfirmationEmail({ recipientName, gifterName, giftMessage });
    await sendResendEmail({
      to: gifterEmail,
      subject: confirmation.subject,
      text: confirmation.text,
      html: confirmation.html,
    });
  }

  return { gift: inserted.id };
}

// Statuses Stripe uses once its own automatic retry schedule has been
// exhausted (or the subscription was outright canceled) — anything before
// this (e.g. a single retry still pending) is left alone, not paused.
const LAPSED_STATUSES = ["past_due", "unpaid", "canceled", "incomplete_expired"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Payments are not configured on the server." });
  }

  const event = req.body;
  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    if (event?.type === "checkout.session.completed") {
      // Re-fetch from Stripe — the source of truth. Never trust the POST body's contents.
      const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
      if (session.payment_status !== "paid") return res.status(200).json({ skipped: "not paid" });

      if (session.metadata?.is_gift === "true") {
        const result = await handleGiftCheckout(session, admin);
        if (result.error) return res.status(500).json(result);
        return res.status(200).json(result);
      }

      const memorialId = session.metadata?.memorial_id;
      if (!memorialId) return res.status(200).json({ skipped: "no memorial_id — likely a pre-signup checkout" });

      const customerId = session.customer ? (typeof session.customer === "string" ? session.customer : session.customer.id) : null;
      const update = { is_paid: true };
      if (customerId) update.stripe_customer_id = customerId;

      const { error } = await admin.from("memorials").update(update).eq("id", memorialId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ unlocked: memorialId });
    }

    if (event?.type === "customer.subscription.updated" || event?.type === "customer.subscription.deleted") {
      const subscriptionId = event.data.object.id;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const paused = LAPSED_STATUSES.includes(subscription.status);

      const { data: rows, error: findErr } = await admin
        .from("memorials")
        .select("id, paused")
        .eq("stripe_subscription_id", subscriptionId)
        .limit(1);
      if (findErr) return res.status(500).json({ error: findErr.message });
      const memorial = rows?.[0];
      if (!memorial) return res.status(200).json({ skipped: "no memorial for this subscription" });
      if (memorial.paused === paused) return res.status(200).json({ unchanged: memorial.id, paused });

      const { error } = await admin.from("memorials").update({ paused }).eq("id", memorial.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ [paused ? "paused" : "unpaused"]: memorial.id });
    }

    return res.status(200).json({ ignored: event?.type || "unknown" });
  } catch (e) {
    return res.status(502).json({ error: "Webhook processing failed", detail: e.message });
  }
}
