// Shared Stripe logic for the two pricing tiers — used by start-checkout.js
// (pre-signup), create-checkout.js (post-signup upgrade), stripe-webhook.js,
// and attach-presignup-payment.js, so a pricing change only has to happen in
// one place and every entry point stays wired to the same three live Stripe
// products. Underscore-prefixed directory: Vercel doesn't turn this into a
// route.
//
// "payg" ($49 + $10/yr): the Checkout Session itself is `mode: "payment"`
// for JUST the $49 build fee — NOT a mixed one-time+recurring subscription
// session. That mixed shape was tried first and doesn't work: Stripe
// Checkout Sessions don't expose subscription_data.add_invoice_items (that's
// a Subscriptions-API-only field), and a one-time line item mixed into a
// subscription-mode session forces its "initial invoice" to be generated
// immediately — in practice that invoice included the recurring item's
// first charge too, trial_period_days or not, confirmed against a real
// Stripe test-mode session (the $10/yr was charged immediately alongside
// the $49, not deferred). So instead: the $49 Checkout Session saves the
// card via payment_intent_data.setup_future_usage, and once payment is
// confirmed (in stripe-webhook.js for a post-signup upgrade, or
// attach-presignup-payment.js for a pre-signup one), the server creates the
// $10/yr subscription directly via the Subscriptions API — a single price,
// no mixing, where trial_period_days behaves exactly as documented ($0 due
// at creation, first real charge a year out). The customer only ever sees
// one payment screen.
//
// "forever" ($100 one-time): plain one-time payment, no subscription object
// ever created — a forever-tier memorial never gets a stripe_subscription_id
// and is therefore never touched by the $10/yr renewal-lapse pause logic.
//
// Every price is built with price_data.product pointing at the real, live
// Stripe product (not an ad-hoc product_data name) — that's what makes
// revenue for these roll up correctly under the right product in Stripe.
export const TIERS = {
  payg: { buildFeeCents: 4900, renewalCents: 1000 },
  forever: { priceCents: 10000 },
};

// Required env vars (Vercel → Settings → Environment Variables):
//   STRIPE_BUILD_FEE_PRODUCT_ID  = prod_V2ovdXLvHFDYgk (payg's one-time $49)
//   STRIPE_KEEPER_FEE_PRODUCT_ID = prod_V2oykd9527Ncw6 (payg's recurring $10/yr)
//   STRIPE_FOREVER_PRODUCT_ID    = prod_V2ozoafZSibzpE (forever's one-time $100)
export function stripeProductIdsConfigured() {
  const { STRIPE_BUILD_FEE_PRODUCT_ID, STRIPE_KEEPER_FEE_PRODUCT_ID, STRIPE_FOREVER_PRODUCT_ID } = process.env;
  return Boolean(STRIPE_BUILD_FEE_PRODUCT_ID && STRIPE_KEEPER_FEE_PRODUCT_ID && STRIPE_FOREVER_PRODUCT_ID);
}

// Builds the params for stripe.checkout.sessions.create() for a given tier.
// Both tiers are `mode: "payment"` now — payg's recurring half is created
// separately, after the fact, by createKeeperFeeSubscription below.
// `extra` merges in caller-specific fields (metadata, success_url, cancel_url).
export function buildCheckoutParams(tier, extra) {
  const { STRIPE_BUILD_FEE_PRODUCT_ID, STRIPE_FOREVER_PRODUCT_ID } = process.env;

  if (tier === "forever") {
    return {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: TIERS.forever.priceCents,
            product: STRIPE_FOREVER_PRODUCT_ID,
          },
        },
      ],
      allow_promotion_codes: true,
      ...extra,
    };
  }

  return {
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: TIERS.payg.buildFeeCents,
          product: STRIPE_BUILD_FEE_PRODUCT_ID,
        },
      },
    ],
    // Required so the card is retained on the resulting Customer — the
    // keeper-fee subscription gets created off-session afterward using it.
    customer_creation: "always",
    payment_intent_data: { setup_future_usage: "off_session" },
    allow_promotion_codes: true,
    ...extra,
  };
}

// Creates the $10/yr keeper-fee subscription with its 365-day trial, for a
// customer who just paid the one-time build fee (see buildCheckoutParams).
// Called once payment is confirmed, from both stripe-webhook.js
// (post-signup upgrade) and attach-presignup-payment.js (pre-signup) — both
// share this so the subscription is created identically either way. A pure
// single-recurring-price subscription with a trial is Stripe's ordinary,
// documented case: $0 due now, first real invoice 365 days out.
export async function createKeeperFeeSubscription(stripe, { customerId, paymentMethodId }) {
  return stripe.subscriptions.create({
    customer: customerId,
    items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: TIERS.payg.renewalCents,
          recurring: { interval: "year" },
          product: process.env.STRIPE_KEEPER_FEE_PRODUCT_ID,
        },
      },
    ],
    trial_period_days: 365,
    default_payment_method: paymentMethodId,
  });
}
