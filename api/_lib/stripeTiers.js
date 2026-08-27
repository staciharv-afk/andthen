// Shared Stripe logic for the single paid tier — used by start-checkout.js
// (pre-signup), create-checkout.js (post-signup upgrade), and
// create-gift-checkout.js (gifted page), so a pricing change only has to
// happen in one place and every entry point stays wired to the same live
// Stripe price. Underscore-prefixed directory: Vercel doesn't turn this
// into a route.
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
// Every checkout references a real, saved Stripe Price (not an ad-hoc
// price_data amount). A saved Price is what lets `allow_promotion_codes`
// work — Stripe rejects promotion codes on price_data line items — and it
// keeps the amount defined in one place (the Stripe dashboard) instead of
// duplicated in code. The Price already points at the live $49 build-fee
// product, so revenue still rolls up under the right product in Stripe.
export const TIERS = {
  build: {},
};

// Required env var (Vercel → Settings → Environment Variables):
//   STRIPE_BUILD_FEE_PRICE_ID  = the saved Stripe Price for the one-time $49
//                                build fee. Live: price_1U2jHIE9GhTJqvitkmONphjF
//                                (use the matching test-mode price id locally).
export function stripeProductIdsConfigured() {
  return Boolean(process.env.STRIPE_BUILD_FEE_PRICE_ID);
}

// Builds the params for stripe.checkout.sessions.create(). `extra` merges in
// caller-specific fields (metadata, success_url, cancel_url).
export function buildCheckoutParams(tier, extra) {
  const { STRIPE_BUILD_FEE_PRICE_ID } = process.env;
  return {
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price: STRIPE_BUILD_FEE_PRICE_ID,
      },
    ],
    allow_promotion_codes: true,
    ...extra,
  };
}
