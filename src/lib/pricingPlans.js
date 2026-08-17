// Single source of truth for the one paid tier's copy — imported by the
// Pricing page (pre-signup, starts Stripe Checkout via start-checkout.js),
// the Dashboard's upgrade button (post-signup, via create-checkout.js), and
// the How It Works page (informational only), so the numbers/copy can't
// drift apart between any of them. The actual Stripe pricing/product wiring
// both checkout entry points share lives in api/_lib/stripeTiers.js.
export const PRICING_PLANS = [
  {
    tier: "build",
    label: "Pay Once",
    price: "$49",
    sub: "One-time build fee — no renewals, ever.",
    body: "$49 unlocks unlimited entries and contributors, plus every feature — photo, video, voice, all of it. One payment, no bill after that. Nothing to renew, nothing to miss.",
  },
];
