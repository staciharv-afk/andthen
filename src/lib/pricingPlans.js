// Single source of truth for the two paid tiers' copy — imported by the
// Pricing page (pre-signup, starts Stripe Checkout via start-checkout.js),
// the Dashboard's upgrade buttons (post-signup, via create-checkout.js),
// and the How It Works page (informational only), so the numbers/copy can't
// drift apart between any of them. The actual Stripe pricing/product wiring
// both checkout entry points share lives in api/_lib/stripeTiers.js.
export const PRICING_PLANS = [
  {
    tier: "payg",
    label: "Pay Yearly",
    price: "$49 to start, then $10/yr",
    sub: "Best if you're not sure how long you'll keep this.",
    body: "$49 unlocks unlimited entries and contributors, plus your first year online. After that, $10/year keeps it live — that rate never goes up. If a payment is ever missed, the page simply pauses until you're ready to pick it back up.",
  },
  {
    tier: "forever",
    label: "Pay Once",
    price: "$100",
    sub: "Best if you want this to last, with nothing to remember.",
    body: "One payment covers the build and hosting for as long as the page exists. No bill, ever — nothing to renew, nothing to miss, nothing that can lapse.",
  },
];
