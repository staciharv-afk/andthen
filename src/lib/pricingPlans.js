// Single source of truth for the two paid tiers' copy — imported by both
// the real Pricing page (interactive, starts Stripe Checkout) and the How
// It Works page (informational only), so the numbers/copy can't drift
// apart between the two.
export const PRICING_PLANS = [
  {
    tier: "payg",
    label: "Pay as you go",
    price: "$49 + $10/yr.",
    sub: "Build once, renew yearly.",
    body: "$49 unlocks unlimited entries and contributors, first year hosting included. $10/yr after that keeps it online — flat rate, never increases. Miss a payment and the page pauses, it doesn't disappear.",
  },
  {
    tier: "forever",
    label: "Pay once",
    price: "$100.",
    sub: "Forever — no renewals.",
    body: "One payment instead of the build fee. No annual fee, ever. Nothing to renew, nothing to miss, nothing that pauses.",
  },
];
