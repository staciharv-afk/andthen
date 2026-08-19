// Vercel serverless function — starts an embedded Stripe Checkout for the
// site's one tier, for a memorial that doesn't exist yet. Two callers:
//  - Pricing.jsx (pre-signup): the person hasn't signed up yet, lands back
//    on onboarding, and the memorial is attached to this session by
//    api/attach-presignup-payment.js right after magic-link signup creates it.
//  - Dashboard.jsx's "+ Start another page" (signed in, already has a free
//    page): a second/third/etc. page skips the free tier entirely and pays
//    upfront, so this lands back on the create form instead — same
//    app.jsx pendingPayment.js stash-and-attach mechanism either way
//    (see app.jsx's handleMemorialCreated), just a different return view.
//
// ui_mode: "embedded" (see src/components/EmbeddedCheckoutModal.jsx) mounts
// Stripe's payment form inline in the page instead of redirecting the whole
// tab to checkout.stripe.com — this returns a client_secret for that, not a
// redirect url. return_url is where Stripe's iframe navigates internally
// once payment completes; app.jsx bounces the real tab there itself (see
// its mount effect).
//
// Tier shape lives in api/_lib/stripeTiers.js, shared with create-checkout.js.
//
// Required env vars (Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY = Stripe secret key (must be sk_live_… in production)
//   See api/_lib/stripeTiers.js for STRIPE_BUILD_FEE_PRODUCT_ID.
import Stripe from "stripe";
import { buildCheckoutParams, stripeProductIdsConfigured } from "./_lib/stripeTiers.js";

const RETURN_VIEWS = new Set(["onboarding", "create"]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { STRIPE_SECRET_KEY } = process.env;
  if (!STRIPE_SECRET_KEY || !stripeProductIdsConfigured()) {
    return res.status(500).json({ error: "Payments are not configured on the server." });
  }

  const tier = req.body?.tier;
  if (tier !== "build") return res.status(400).json({ error: "Unknown pricing tier" });
  const returnView = RETURN_VIEWS.has(req.body?.returnView) ? req.body.returnView : "onboarding";

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.create(buildCheckoutParams(tier, {
      metadata: { tier },
      ui_mode: "embedded",
      return_url: `${origin}/?view=${returnView}&paid_session={CHECKOUT_SESSION_ID}&tier=${tier}`,
    }));
    return res.status(200).json({ clientSecret: session.client_secret });
  } catch (e) {
    return res.status(502).json({ error: "Could not start checkout", detail: e.message });
  }
}
