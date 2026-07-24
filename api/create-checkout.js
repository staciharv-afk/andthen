// Vercel serverless function — starts a Stripe Checkout for the one-time $149
// upgrade of a single memorial. Returns the hosted-checkout URL; the client
// redirects to it. The actual unlock happens server-side in stripe-webhook.js
// after payment, so nothing here trusts the client for payment state.
//
// Required env vars (Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY           = Stripe secret key (sk_test_… while testing)
//   SUPABASE_SERVICE_ROLE_KEY   = Supabase service_role key (secret)
// Optional:
//   SUPABASE_URL                = falls back to VITE_SUPABASE_URL
//   UPGRADE_PRICE_CENTS         = defaults to 14900 ($149)
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Payments are not configured on the server." });
  }

  const memorialId = req.body?.memorialId;
  if (!memorialId) return res.status(400).json({ error: "Missing memorialId" });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: rows, error } = await admin
    .from("memorials")
    .select("id, name, is_paid")
    .eq("id", memorialId)
    .limit(1);
  if (error) return res.status(500).json({ error: error.message });
  const memorial = rows?.[0];
  if (!memorial) return res.status(404).json({ error: "Memorial not found" });
  if (memorial.is_paid) return res.status(400).json({ error: "This memorial is already upgraded." });

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const amount = parseInt(process.env.UPGRADE_PRICE_CENTS || "14900", 10);
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amount,
            product_data: { name: `And Then — permanent upgrade for ${memorial.name}` },
          },
        },
      ],
      allow_promotion_codes: true, // Staci's founding-customer / promo codes
      metadata: { memorial_id: memorial.id },
      success_url: `${origin}/?view=dashboard&upgraded=1`,
      cancel_url: `${origin}/?view=dashboard`,
    });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(502).json({ error: "Could not start checkout", detail: e.message });
  }
}
