// Shared Stripe logic for the single paid tier — used by start-checkout.js
// (pre-signup) and create-checkout.js (post-signup upgrade), so a pricing
// change only has to happen in one place and both entry points stay wired
// to the same live Stripe product. Underscore-prefixed directory: Vercel
// doesn't turn this into a route.
//
// "build" ($49 one-time): a single Checkout Session, mode: "payment", no
// subscription object ever created — a memorial never gets a
// stripe_subscription_id and is therefore never touched by the pause-on-
// lapsed-renewal logic in stripe-webhook.js. That logic (and the
// stripe_subscription_id/paused columns) is left in place purely to keep
// working correctly for any pre-existing subscriptions created before this
// tier became one-time-only — it's dead code for every purchase from here
// on, not something a future cleanup needs to rush.
//
// Every price is built with price_data.product pointing at the real, live
// Stripe product (not an ad-hoc product_data name) — that's what makes
// revenue for this roll up correctly under the right product in Stripe.
export const TIERS = {
  build: { priceCents: 4900 },
};

// Required env var (Vercel → Settings → Environment Variables):
//   STRIPE_BUILD_FEE_PRODUCT_ID  = prod_V2ovdXLvHFDYgk (the one-time $49 build fee)
export function stripeProductIdsConfigured() {
  return Boolean(process.env.STRIPE_BUILD_FEE_PRODUCT_ID);
}

// Builds the params for stripe.checkout.sessions.create(). `extra` merges in
// caller-specific fields (metadata, success_url, cancel_url).
export function buildCheckoutParams(tier, extra) {
  const { STRIPE_BUILD_FEE_PRODUCT_ID } = process.env;
  return {
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: TIERS.build.priceCents,
          product: STRIPE_BUILD_FEE_PRODUCT_ID,
        },
      },
    ],
    allow_promotion_codes: true,
    ...extra,
  };
}
